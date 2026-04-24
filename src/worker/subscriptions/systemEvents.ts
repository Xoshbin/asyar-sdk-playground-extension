// ───────────────────────────────────────────────────────────────────────────
// worker/subscriptions/systemEvents.ts
//
// Installs / uninstalls push subscriptions for the 6 system-event kinds based
// on the `subscriptions.systemEvents` state map. On each event, appends to
// `logs.systemEvents` and bumps `counters.systemEvents` in state.
// ───────────────────────────────────────────────────────────────────────────

import type {
  Disposer,
  ExtensionStateProxy,
  ISystemEventsService,
} from 'asyar-sdk/contracts';
import {
  STATE_KEYS,
  LOG_CAPS,
  type CounterMap,
  type SystemEventKind,
  type SystemEventLogEntry,
} from '../../stateKeys';
import { appendBounded } from '../../lib/logBuffer';

const ALL_KINDS: readonly SystemEventKind[] = [
  'sleep',
  'wake',
  'lid-open',
  'lid-close',
  'battery-level-changed',
  'power-source-changed',
];

export interface SystemEventsController {
  applyDesired(enabled: Partial<Record<SystemEventKind, boolean>>): Promise<void>;
  shutdown(): void;
}

export function createSystemEventsController(deps: {
  service: ISystemEventsService;
  state: ExtensionStateProxy;
}): SystemEventsController {
  const disposers = new Map<SystemEventKind, Disposer>();

  async function push(kind: SystemEventKind, payload: string): Promise<void> {
    // Tail the log.
    const log =
      ((await deps.state.get(STATE_KEYS.logsSystemEvents)) as
        | SystemEventLogEntry[]
        | null) ?? [];
    const entry: SystemEventLogEntry = { at: Date.now(), kind, payload };
    await deps.state.set(
      STATE_KEYS.logsSystemEvents,
      appendBounded(log, entry, LOG_CAPS[STATE_KEYS.logsSystemEvents]),
    );

    // Bump the per-kind counter.
    const counters =
      ((await deps.state.get(STATE_KEYS.countersSystemEvents)) as
        | CounterMap<SystemEventKind>
        | null) ?? ({} as CounterMap<SystemEventKind>);
    const prev = counters[kind] ?? { count: 0, last: '' };
    counters[kind] = { count: prev.count + 1, last: payload };
    await deps.state.set(STATE_KEYS.countersSystemEvents, counters);
  }

  function subscribe(kind: SystemEventKind): Disposer {
    switch (kind) {
      case 'sleep':
        return deps.service.onSystemSleep(() => void push('sleep', '(no payload)'));
      case 'wake':
        return deps.service.onSystemWake(() => void push('wake', '(no payload)'));
      case 'lid-open':
        return deps.service.onLidOpen(() => void push('lid-open', '(no payload)'));
      case 'lid-close':
        return deps.service.onLidClose(() => void push('lid-close', '(no payload)'));
      case 'battery-level-changed':
        return deps.service.onBatteryLevelChange((percent) =>
          void push('battery-level-changed', `${percent}%`),
        );
      case 'power-source-changed':
        return deps.service.onPowerSourceChange((onBattery) =>
          void push('power-source-changed', onBattery ? 'on battery' : 'on AC'),
        );
    }
  }

  return {
    async applyDesired(enabled) {
      for (const kind of ALL_KINDS) {
        const want = enabled[kind] === true;
        const have = disposers.has(kind);
        if (want && !have) {
          disposers.set(kind, subscribe(kind));
        } else if (!want && have) {
          const d = disposers.get(kind);
          d?.();
          disposers.delete(kind);
        }
      }
    },
    shutdown() {
      for (const d of disposers.values()) {
        try {
          d();
        } catch {
          // Best-effort teardown
        }
      }
      disposers.clear();
    },
  };
}
