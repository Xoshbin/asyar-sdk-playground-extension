// ───────────────────────────────────────────────────────────────────────────
// worker/subscriptions/fsWatch.ts
//
// Owns the single active filesystem watch handle for the playground demo.
// View RPCs flip this on/off; the worker resumes from `fsWatchActive` on
// activate so a launcher relaunch picks the watch back up without view
// interaction. Push events arrive at the worker iframe (always-on under
// `keep_alive: None`), so the demo proves fs-watch survives view Dormant.
// ───────────────────────────────────────────────────────────────────────────

import type {
  ExtensionStateProxy,
  FileSystemChangeEvent,
  IFileSystemWatcherService,
  WatcherHandle,
} from 'asyar-sdk/contracts';
import {
  STATE_KEYS,
  LOG_CAPS,
  type FsWatchActiveState,
  type FsWatchEventLogEntry,
} from '../../stateKeys';
import { appendBounded } from '../../lib/logBuffer';

export interface FsWatchController {
  startWatching(path: string): Promise<void>;
  stopWatching(): Promise<void>;
  bootFromState(): Promise<void>;
  shutdown(): Promise<void>;
}

export function createFsWatchController(deps: {
  service: IFileSystemWatcherService;
  state: ExtensionStateProxy;
}): FsWatchController {
  let handle: WatcherHandle | null = null;

  async function recordChange(ev: FileSystemChangeEvent): Promise<void> {
    const count =
      ((await deps.state.get(STATE_KEYS.fsWatchEventCount)) as number | null) ??
      0;
    await deps.state.set(STATE_KEYS.fsWatchEventCount, count + 1);

    const lastEntry: FsWatchEventLogEntry = {
      at: Date.now(),
      paths: ev.paths,
    };
    await deps.state.set(STATE_KEYS.fsWatchLastEvent, lastEntry);

    const log =
      ((await deps.state.get(STATE_KEYS.logsFsWatch)) as
        | FsWatchEventLogEntry[]
        | null) ?? [];
    await deps.state.set(
      STATE_KEYS.logsFsWatch,
      appendBounded(log, lastEntry, LOG_CAPS[STATE_KEYS.logsFsWatch]),
    );
  }

  async function disposeCurrent(): Promise<void> {
    if (!handle) return;
    const h = handle;
    handle = null;
    try {
      await h.dispose();
    } catch {
      // Best-effort teardown — host-side sweep is authoritative.
    }
  }

  return {
    async startWatching(path) {
      await disposeCurrent();
      handle = await deps.service.watch([path]);
      handle.onChange((ev) => void recordChange(ev));
      const active: FsWatchActiveState = { path, startedAt: Date.now() };
      await deps.state.set(STATE_KEYS.fsWatchActive, active);
    },

    async stopWatching() {
      await disposeCurrent();
      await deps.state.set(STATE_KEYS.fsWatchActive, null);
    },

    async bootFromState() {
      const active = (await deps.state.get(STATE_KEYS.fsWatchActive)) as
        | FsWatchActiveState
        | null;
      if (!active?.path) return;
      try {
        handle = await deps.service.watch([active.path]);
        handle.onChange((ev) => void recordChange(ev));
      } catch {
        // Persisted path is no longer watchable (deleted between sessions,
        // permissions changed, etc.). Clear the stale state so the view
        // doesn't show a phantom ON with no handle behind it.
        await deps.state.set(STATE_KEYS.fsWatchActive, null);
      }
    },

    async shutdown() {
      await disposeCurrent();
    },
  };
}
