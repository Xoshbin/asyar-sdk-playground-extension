import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFsWatchController } from './fsWatch';
import { STATE_KEYS } from '../../stateKeys';

type ChangeCb = (e: { type: 'change'; paths: string[] }) => void;

interface FakeHandle {
  onChange(cb: ChangeCb): () => void;
  dispose(): Promise<void>;
  fire(paths: string[]): void;
  disposeCalls: number;
  cb: ChangeCb | null;
}

function makeFakeHandle(): FakeHandle {
  const handle: FakeHandle = {
    cb: null,
    disposeCalls: 0,
    onChange(cb) {
      handle.cb = cb;
      return () => {
        handle.cb = null;
      };
    },
    async dispose() {
      handle.disposeCalls += 1;
    },
    fire(paths) {
      handle.cb?.({ type: 'change', paths });
    },
  };
  return handle;
}

function makeFakeService(): {
  watch: ReturnType<typeof vi.fn>;
  handles: FakeHandle[];
} {
  const handles: FakeHandle[] = [];
  const watch = vi.fn(async (_paths: string[]) => {
    const h = makeFakeHandle();
    handles.push(h);
    return h;
  });
  return { watch, handles };
}

function makeFakeState(): {
  store: Map<string, unknown>;
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
} {
  const store = new Map<string, unknown>();
  const get = vi.fn(async (key: string) => store.get(key) ?? null);
  const set = vi.fn(async (key: string, value: unknown) => {
    store.set(key, value);
  });
  return { store, get, set };
}

describe('createFsWatchController', () => {
  let svc: ReturnType<typeof makeFakeService>;
  let state: ReturnType<typeof makeFakeState>;

  beforeEach(() => {
    svc = makeFakeService();
    state = makeFakeState();
  });

  function build() {
    return createFsWatchController({
      service: svc as never,
      state: state as never,
    });
  }

  it('startWatching invokes service.watch with the given path and persists active state', async () => {
    const ctrl = build();
    await ctrl.startWatching('/tmp/asyar-fs-watch');
    expect(svc.watch).toHaveBeenCalledWith(['/tmp/asyar-fs-watch']);
    const active = state.store.get(STATE_KEYS.fsWatchActive) as
      | { path: string; startedAt: number }
      | null;
    expect(active?.path).toBe('/tmp/asyar-fs-watch');
    expect(typeof active?.startedAt).toBe('number');
  });

  it('startWatching while already watching disposes the previous handle first', async () => {
    const ctrl = build();
    await ctrl.startWatching('/tmp/asyar-fs-watch');
    await ctrl.startWatching('/tmp/asyar-fs-watch');
    expect(svc.handles.length).toBe(2);
    expect(svc.handles[0].disposeCalls).toBe(1);
    expect(svc.handles[1].disposeCalls).toBe(0);
  });

  it('change event increments eventCount, sets lastEvent, appends to log', async () => {
    const ctrl = build();
    await ctrl.startWatching('/tmp/asyar-fs-watch');
    svc.handles[0].fire(['/tmp/asyar-fs-watch']);
    // The change handler is async (it does state.set under the hood); flush.
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(state.store.get(STATE_KEYS.fsWatchEventCount)).toBe(1);
    const last = state.store.get(STATE_KEYS.fsWatchLastEvent) as
      | { at: number; paths: string[] }
      | null;
    expect(last?.paths).toEqual(['/tmp/asyar-fs-watch']);
    const log = state.store.get(STATE_KEYS.logsFsWatch) as
      | Array<{ at: number; paths: string[] }>
      | null;
    expect(log?.length).toBe(1);
    expect(log?.[0].paths).toEqual(['/tmp/asyar-fs-watch']);
  });

  it('stopWatching disposes the handle and clears fsWatchActive', async () => {
    const ctrl = build();
    await ctrl.startWatching('/tmp/asyar-fs-watch');
    await ctrl.stopWatching();
    expect(svc.handles[0].disposeCalls).toBe(1);
    expect(state.store.get(STATE_KEYS.fsWatchActive)).toBeNull();
  });

  it('stopWatching when not watching is a no-op', async () => {
    const ctrl = build();
    await ctrl.stopWatching();
    expect(svc.handles.length).toBe(0);
  });

  it('bootFromState re-starts watch when fsWatchActive is persisted', async () => {
    state.store.set(STATE_KEYS.fsWatchActive, {
      path: '/tmp/asyar-fs-watch',
      startedAt: 1234,
    });
    const ctrl = build();
    await ctrl.bootFromState();
    expect(svc.watch).toHaveBeenCalledWith(['/tmp/asyar-fs-watch']);
  });

  it('bootFromState is a no-op when fsWatchActive is unset', async () => {
    const ctrl = build();
    await ctrl.bootFromState();
    expect(svc.watch).not.toHaveBeenCalled();
  });

  it('bootFromState clears fsWatchActive when the persisted path is no longer watchable', async () => {
    // If the persisted path was deleted between sessions, host-side
    // canonicalization rejects the boot-restore. The controller must
    // clear the stale active state so the view doesn't show a phantom
    // ON with no actual handle behind it.
    state.store.set(STATE_KEYS.fsWatchActive, {
      path: '/tmp/gone',
      startedAt: 1234,
    });
    svc.watch.mockRejectedValueOnce(
      new Error("fs:watch path '/tmp/gone' does not exist or is not accessible"),
    );
    const ctrl = build();
    await ctrl.bootFromState();
    expect(state.store.get(STATE_KEYS.fsWatchActive)).toBeNull();
  });

  it('shutdown disposes the handle but does not clear fsWatchActive', async () => {
    const ctrl = build();
    await ctrl.startWatching('/tmp/asyar-fs-watch');
    await ctrl.shutdown();
    expect(svc.handles[0].disposeCalls).toBe(1);
    expect(state.store.get(STATE_KEYS.fsWatchActive)).toEqual(
      expect.objectContaining({ path: '/tmp/asyar-fs-watch' }),
    );
  });

  it('log respects LOG_CAPS.logsFsWatch (25)', async () => {
    const ctrl = build();
    await ctrl.startWatching('/tmp/asyar-fs-watch');
    for (let i = 0; i < 30; i += 1) {
      svc.handles[0].fire([`/tmp/asyar-fs-watch/file-${i}.txt`]);
      await new Promise((r) => setTimeout(r, 0));
    }
    const log = state.store.get(STATE_KEYS.logsFsWatch) as unknown[];
    expect(log.length).toBe(25);
  });
});
