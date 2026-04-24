// ───────────────────────────────────────────────────────────────────────────
// worker.ts — SDK Playground Tier 2 worker entry, loaded by dist/worker.html.
//
// Owns every long-lived concern:
//   - Scheduled tick handlers (tick-test, tick-test-fast) → logs.scheduling
//   - Notification-action commandIds (notif-extend, notif-stop) [step 3]
//   - Timer fire commandIds (timer-ring, timer-snooze)         [step 3]
//   - greet command                                            [step 6]
//   - System events + Application push subscriptions           [step 2]
//   - StatusBar tray registration + click callbacks            [step 4]
//   - RPC handlers for view-initiated actions
//
// Imports come from `asyar-sdk/worker` (role-asserted) and
// `asyar-sdk/contracts` (pure types).
// ───────────────────────────────────────────────────────────────────────────

import {
  ExtensionContext as WorkerExtensionContext,
  extensionBridge,
} from 'asyar-sdk/worker';
import type {
  Extension,
  ExtensionContext,
  CommandExecuteArgs,
  IApplicationService,
  ICommandService,
  ILogService,
  INotificationService,
  IStatusBarService,
  ISystemEventsService,
  ExtensionStateProxy,
} from 'asyar-sdk/contracts';

import manifest from '../manifest.json';
import {
  STATE_KEYS,
  LOG_CAPS,
  type ApplicationPushKind,
  type GreetLast,
  type NotifActionLogEntry,
  type SystemEventKind,
  type TickEvent,
  type TimerFireLogEntry,
} from './stateKeys';
import { appendBounded } from './lib/logBuffer';
import { parseGreetArgs, buildGreeting } from './lib/greet';
import { createSystemEventsController } from './worker/subscriptions/systemEvents';
import { createApplicationPushController } from './worker/subscriptions/application';
import { createStatusBarController } from './worker/tray/trayController';

const extensionId =
  window.location.hostname === 'localhost' ||
  window.location.hostname === 'asyar-extension.localhost'
    ? window.location.pathname.split('/').filter(Boolean)[0] ||
      'org.asyar.sdk-playground'
    : window.location.hostname || 'org.asyar.sdk-playground';

const workerContext = new WorkerExtensionContext();
workerContext.setExtensionId(extensionId);

const log = workerContext.getService<ILogService>('log');
const commandsService = workerContext.getService<ICommandService>('commands');
const notifier = workerContext.getService<INotificationService>('notifications');
const applicationService = workerContext.getService<IApplicationService>('application');
const systemEventsService = workerContext.getService<ISystemEventsService>('systemEvents');
const statusBarService = workerContext.getService<IStatusBarService>('statusBar');
const stateProxy = workerContext.getService<ExtensionStateProxy>('state');

// ───────────────────────────────────────────────────────────────────────────
// Push subscription controllers — worker-owned so they survive view Dormant.
// ───────────────────────────────────────────────────────────────────────────
const systemEventsController = createSystemEventsController({
  service: systemEventsService,
  state: stateProxy,
});
const applicationPushController = createApplicationPushController({
  service: applicationService,
  state: stateProxy,
});
const trayController = createStatusBarController({
  statusBar: statusBarService,
  state: stateProxy,
});

// ───────────────────────────────────────────────────────────────────────────
// Helpers: bounded append to a state-key log.
// ───────────────────────────────────────────────────────────────────────────
async function appendToLog<T>(key: string, entry: T, cap: number): Promise<void> {
  const current = ((await stateProxy.get(key)) as T[] | null) ?? [];
  const next = appendBounded(current, entry, cap);
  await stateProxy.set(key, next);
}

// ───────────────────────────────────────────────────────────────────────────
// Scheduling dispatcher — the tick-test / tick-test-fast path.
// ───────────────────────────────────────────────────────────────────────────
async function recordTick(
  commandId: string,
  args: Record<string, unknown>,
): Promise<void> {
  const scheduledTick = args?.scheduledTick === true;
  const entry: TickEvent = {
    at: Date.now(),
    isScheduled: scheduledTick,
    commandId,
    args,
  };
  await appendToLog(STATE_KEYS.logsScheduling, entry, LOG_CAPS[STATE_KEYS.logsScheduling]);

  // Only the canonical 60-s command drives its own search-result subtitle.
  if (commandId === 'tick-test') {
    const allTicks =
      ((await stateProxy.get(STATE_KEYS.logsScheduling)) as TickEvent[] | null) ?? [];
    const forCmd = allTicks.filter((t) => t.commandId === 'tick-test');
    const last = forCmd[forCmd.length - 1];
    if (last) {
      const hh = new Date(last.at).toLocaleTimeString(undefined, {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      await commandsService
        .updateCommandMetadata('tick-test', {
          subtitle: `Ticked ${forCmd.length} times · Last: ${hh}`,
        })
        .catch((err: unknown) => log.warn(`updateCommandMetadata failed: ${describe(err)}`));
    }
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Notification-action dispatcher — notif-extend / notif-stop commandIds.
// Fires when the user clicks an action button on an OS notification; the
// handler must survive view Dormant (that's the whole point of 6.C → 6.E).
// ───────────────────────────────────────────────────────────────────────────
async function recordNotifAction(
  commandId: string,
  rawArgs: Record<string, unknown>,
): Promise<void> {
  const userArgs = ((rawArgs as { arguments?: Record<string, unknown> }).arguments as
    | Record<string, unknown>
    | undefined) ?? rawArgs;
  const note =
    commandId === 'notif-extend'
      ? `☕ extend by ${String(userArgs.minutes ?? '?')}m`
      : '\u{1F6D1} stop requested';
  const entry: NotifActionLogEntry = {
    at: Date.now(),
    commandId,
    args: userArgs,
    note,
  };
  const current =
    ((await stateProxy.get(STATE_KEYS.logsNotifActions)) as NotifActionLogEntry[] | null) ?? [];
  await stateProxy.set(
    STATE_KEYS.logsNotifActions,
    appendBounded(current, entry, LOG_CAPS[STATE_KEYS.logsNotifActions]),
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Timer-fire dispatcher — timer-ring / timer-snooze commandIds fire when a
// one-shot timer's deadline arrives (Rust scheduler → launcher bridge →
// worker iframe). Must land in state so the view picks it up on its next
// mount even if it was Dormant at fire time.
// ───────────────────────────────────────────────────────────────────────────
async function recordTimerFire(
  commandId: string,
  rawArgs: Record<string, unknown>,
): Promise<void> {
  const userArgs = ((rawArgs as { arguments?: Record<string, unknown> }).arguments as
    | Record<string, unknown>
    | undefined) ?? rawArgs;
  const note =
    commandId === 'timer-ring'
      ? `⏰ ring (${String(userArgs.label ?? 'no label')})`
      : `\u{1F4A4} snooze — rescheduled ${String(userArgs.minutes ?? '?')} min`;
  const entry: TimerFireLogEntry = {
    at: Date.now(),
    commandId,
    args: userArgs,
    note,
  };
  const current =
    ((await stateProxy.get(STATE_KEYS.logsTimerFires)) as TimerFireLogEntry[] | null) ?? [];
  await stateProxy.set(
    STATE_KEYS.logsTimerFires,
    appendBounded(current, entry, LOG_CAPS[STATE_KEYS.logsTimerFires]),
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Extension impl — background-commands dispatch.
// ───────────────────────────────────────────────────────────────────────────
class SDKPlaygroundWorkerExtension implements Extension {
  async initialize(_ctx: ExtensionContext): Promise<void> {}

  async activate(): Promise<void> {
    log.info(`[${extensionId}] worker activated`);
    // Re-install any push subscriptions whose flag is set in state. This
    // covers the "launcher relaunched while a subscription was active"
    // path — the view never gets a chance to toggle them back on.
    const sysDesired =
      ((await stateProxy.get(STATE_KEYS.subsSystemEvents)) as
        | Partial<Record<SystemEventKind, boolean>>
        | null) ?? {};
    await systemEventsController.applyDesired(sysDesired);
    const appDesired =
      ((await stateProxy.get(STATE_KEYS.subsApplication)) as
        | Partial<Record<ApplicationPushKind, boolean>>
        | null) ?? {};
    await applicationPushController.applyDesired(appDesired);

    // Re-register tray items that were active before this launch.
    await trayController.bootFromState();
  }

  async deactivate(): Promise<void> {
    systemEventsController.shutdown();
    applicationPushController.shutdown();
    await trayController.shutdown();
    log.info(`[${extensionId}] worker deactivated`);
  }

  async executeCommand(
    commandId: string,
    args?: CommandExecuteArgs,
  ): Promise<unknown> {
    const rawArgs = (args ?? {}) as Record<string, unknown>;
    switch (commandId) {
      case 'tick-test':
      case 'tick-test-fast':
        await recordTick(commandId, rawArgs);
        return;

      case 'notif-extend':
      case 'notif-stop':
        await recordNotifAction(commandId, rawArgs);
        return;

      case 'timer-ring':
      case 'timer-snooze':
        await recordTimerFire(commandId, rawArgs);
        return;

      case 'greet':
        await handleGreet(rawArgs);
        return;

      default:
        return undefined;
    }
  }

  onUnload = (): void => {};
}

// ───────────────────────────────────────────────────────────────────────────
// greet dispatcher — §4.2 resolution: use notification.send, not feedback.
// ───────────────────────────────────────────────────────────────────────────
async function handleGreet(rawArgs: Record<string, unknown>): Promise<void> {
  const nested =
    ((rawArgs as { arguments?: Record<string, unknown> }).arguments as Record<string, unknown> | undefined) ??
    {};
  const parsed = parseGreetArgs(nested);
  const greeting = buildGreeting(parsed);

  const entry: GreetLast = {
    at: Date.now(),
    greeting,
    args: nested,
  };
  await stateProxy.set(STATE_KEYS.greetLast, entry);

  try {
    await notifier.send({ title: 'Greet', body: greeting });
  } catch (err: unknown) {
    log.warn(`greet notification failed: ${describe(err)}`);
  }
}

const workerExtension = new SDKPlaygroundWorkerExtension();

extensionBridge.registerManifest(
  manifest as Parameters<typeof extensionBridge.registerManifest>[0],
);
extensionBridge.registerExtensionImplementation(extensionId, workerExtension);

// ───────────────────────────────────────────────────────────────────────────
// RPC handlers — view-initiated.
// ───────────────────────────────────────────────────────────────────────────

// simulateScheduledTick — fires the same path as a real scheduler tick but
// with scheduledTick=false so the section UI can distinguish the origin.
workerContext.onRequest<{ commandId?: string }, void>(
  'simulateScheduledTick',
  async (payload) => {
    const cid = payload?.commandId === 'tick-test-fast' ? 'tick-test-fast' : 'tick-test';
    await recordTick(cid, { scheduledTick: false, source: 'manual' });
  },
);

// clearLog — wipe any rolling log by key.
workerContext.onRequest<{ logKey?: string }, void>('clearLog', async (payload) => {
  const key = payload?.logKey;
  if (!key) return;
  await stateProxy.set(key, []);
});

// toggleSubscription — flip a per-kind push subscription on/off and persist
// the resulting map so worker boot reinstalls the desired set.
workerContext.onRequest<
  { surface?: 'systemEvents' | 'application'; kind?: string; enabled?: boolean },
  void
>('toggleSubscription', async (payload) => {
  const surface = payload?.surface;
  const kind = payload?.kind;
  const enabled = payload?.enabled === true;
  if (!surface || !kind) return;

  if (surface === 'systemEvents') {
    const current =
      ((await stateProxy.get(STATE_KEYS.subsSystemEvents)) as
        | Partial<Record<SystemEventKind, boolean>>
        | null) ?? {};
    const next = { ...current, [kind]: enabled } as Partial<Record<SystemEventKind, boolean>>;
    await stateProxy.set(STATE_KEYS.subsSystemEvents, next);
    await systemEventsController.applyDesired(next);
  } else if (surface === 'application') {
    const current =
      ((await stateProxy.get(STATE_KEYS.subsApplication)) as
        | Partial<Record<ApplicationPushKind, boolean>>
        | null) ?? {};
    const next = { ...current, [kind]: enabled } as Partial<Record<ApplicationPushKind, boolean>>;
    await stateProxy.set(STATE_KEYS.subsApplication, next);
    await applicationPushController.applyDesired(next);
  }
});

// resetCounters — wipe per-kind count + last payload for a surface.
workerContext.onRequest<{ surface?: 'systemEvents' | 'application' }, void>(
  'resetCounters',
  async (payload) => {
    if (payload?.surface === 'systemEvents') {
      await stateProxy.set(STATE_KEYS.countersSystemEvents, {});
    } else if (payload?.surface === 'application') {
      await stateProxy.set(STATE_KEYS.countersApplication, {});
    }
  },
);

// ───────────────────────────────────────────────────────────────────────────
// StatusBar RPCs — worker owns registration, click callbacks, tray state.
// ───────────────────────────────────────────────────────────────────────────
workerContext.onRequest<{ icon?: string; tooltip?: string }, { ok: boolean; error?: string }>(
  'statusBar.registerCoffee',
  async (payload) => {
    try {
      await trayController.registerCoffee(
        payload?.icon ?? '☕',
        payload?.tooltip ?? 'Coffee — SDK Playground',
      );
      return { ok: true };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
);

workerContext.onRequest<Record<string, never>, { ok: true }>(
  'statusBar.unregisterCoffee',
  async () => {
    await trayController.unregisterCoffee();
    return { ok: true };
  },
);

workerContext.onRequest<Record<string, never>, { ok: boolean; error?: string }>(
  'statusBar.registerMusic',
  async () => {
    try {
      await trayController.registerMusic();
      return { ok: true };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
);

workerContext.onRequest<Record<string, never>, { ok: true }>(
  'statusBar.unregisterMusic',
  async () => {
    await trayController.unregisterMusic();
    return { ok: true };
  },
);

workerContext.onRequest<Record<string, never>, { ok: false; error: string }>(
  'statusBar.tryInvalid',
  async () => ({ ok: false, error: await trayController.tryInvalid() }),
);

// ───────────────────────────────────────────────────────────────────────────
// Activate.
// ───────────────────────────────────────────────────────────────────────────
void (async () => {
  try {
    await workerExtension.activate();
  } catch (err: unknown) {
    log.error(`[${extensionId}] worker activate failed: ${describe(err)}`);
  }
})();

window.addEventListener('beforeunload', () => {
  void workerExtension.deactivate();
});

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
