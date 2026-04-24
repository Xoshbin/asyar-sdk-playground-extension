// ───────────────────────────────────────────────────────────────────────────
// worker/subscriptions/application.ts
//
// Installs / uninstalls push subscriptions for the 3 application push kinds
// based on the `subscriptions.application` state map. On each event appends
// to `logs.application` and bumps `counters.application` in state.
// ───────────────────────────────────────────────────────────────────────────

import type {
  AppPresenceEvent,
  Disposer,
  ExtensionStateProxy,
  IApplicationService,
} from 'asyar-sdk/contracts';
import {
  STATE_KEYS,
  LOG_CAPS,
  type ApplicationLogEntry,
  type ApplicationPushKind,
  type CounterMap,
} from '../../stateKeys';
import { appendBounded } from '../../lib/logBuffer';

const ALL_KINDS: readonly ApplicationPushKind[] = [
  'launched',
  'terminated',
  'frontmost-changed',
];

export interface ApplicationPushController {
  applyDesired(enabled: Partial<Record<ApplicationPushKind, boolean>>): Promise<void>;
  shutdown(): void;
}

function summary(e: AppPresenceEvent): string {
  const id = e.bundleId ? ` · ${e.bundleId}` : '';
  return `${e.name} (pid ${e.pid})${id}`;
}

export function createApplicationPushController(deps: {
  service: IApplicationService;
  state: ExtensionStateProxy;
}): ApplicationPushController {
  const disposers = new Map<ApplicationPushKind, Disposer>();

  async function push(kind: ApplicationPushKind, e: AppPresenceEvent): Promise<void> {
    const s = summary(e);

    const log =
      ((await deps.state.get(STATE_KEYS.logsApplication)) as
        | ApplicationLogEntry[]
        | null) ?? [];
    const entry: ApplicationLogEntry = { at: Date.now(), kind, summary: s };
    await deps.state.set(
      STATE_KEYS.logsApplication,
      appendBounded(log, entry, LOG_CAPS[STATE_KEYS.logsApplication]),
    );

    const counters =
      ((await deps.state.get(STATE_KEYS.countersApplication)) as
        | CounterMap<ApplicationPushKind>
        | null) ?? ({} as CounterMap<ApplicationPushKind>);
    const prev = counters[kind] ?? { count: 0, last: '' };
    counters[kind] = { count: prev.count + 1, last: s };
    await deps.state.set(STATE_KEYS.countersApplication, counters);
  }

  function subscribe(kind: ApplicationPushKind): Disposer {
    switch (kind) {
      case 'launched':
        return deps.service.onApplicationLaunched((e) => void push('launched', e));
      case 'terminated':
        return deps.service.onApplicationTerminated((e) => void push('terminated', e));
      case 'frontmost-changed':
        return deps.service.onFrontmostApplicationChanged((e) =>
          void push('frontmost-changed', e),
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
