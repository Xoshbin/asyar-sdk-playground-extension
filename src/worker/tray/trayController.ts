// ───────────────────────────────────────────────────────────────────────────
// worker/tray/trayController.ts
//
// Owns the two demo tray items (coffee-pot with submenu + music top-level).
// Tray state (playing / muted / volumeLevel) lives in the state broker so it
// survives launcher restart; click callbacks write to `logs.statusBarClicks`
// and toggle the tray state; the view merely dispatches the RPCs below.
// ───────────────────────────────────────────────────────────────────────────

import type {
  ExtensionStateProxy,
  IStatusBarService,
} from 'asyar-sdk/contracts';
import {
  STATE_KEYS,
  LOG_CAPS,
  type StatusBarClickLogEntry,
  type StatusBarRegisteredState,
  type StatusBarTrayState,
} from '../../stateKeys';
import { appendBounded } from '../../lib/logBuffer';

export const COFFEE_ID = 'coffee-pot';
export const MUSIC_ID = 'sdk-music';

const DEFAULT_TRAY_STATE: StatusBarTrayState = {
  playing: false,
  muted: false,
  volumeLevel: 'medium',
};

const DEFAULT_REGISTERED: StatusBarRegisteredState = {
  coffee: false,
  music: false,
};

export interface StatusBarController {
  registerCoffee(icon: string, tooltip: string): Promise<void>;
  unregisterCoffee(): Promise<void>;
  registerMusic(): Promise<void>;
  unregisterMusic(): Promise<void>;
  tryInvalid(): Promise<string>;
  bootFromState(): Promise<void>;
  shutdown(): Promise<void>;
}

export function createStatusBarController(deps: {
  statusBar: IStatusBarService;
  state: ExtensionStateProxy;
}): StatusBarController {
  // In-memory caches so the click handlers don't roundtrip to state just to
  // rebuild the tree. Kept in lock-step with state via read-modify-write.
  let coffeeConfig: { icon: string; tooltip: string } = { icon: '☕', tooltip: 'Coffee — SDK Playground' };

  async function recordClick(
    itemPath: string[],
    note: string,
    checked?: boolean,
  ): Promise<void> {
    const log =
      ((await deps.state.get(STATE_KEYS.logsStatusBarClicks)) as
        | StatusBarClickLogEntry[]
        | null) ?? [];
    const entry: StatusBarClickLogEntry = {
      at: Date.now(),
      itemPath,
      checked,
      note,
    };
    await deps.state.set(
      STATE_KEYS.logsStatusBarClicks,
      appendBounded(log, entry, LOG_CAPS[STATE_KEYS.logsStatusBarClicks]),
    );
  }

  async function readTray(): Promise<StatusBarTrayState> {
    const v = (await deps.state.get(STATE_KEYS.statusBarTray)) as StatusBarTrayState | null;
    return v ?? DEFAULT_TRAY_STATE;
  }

  async function writeTray(next: StatusBarTrayState): Promise<void> {
    await deps.state.set(STATE_KEYS.statusBarTray, next);
  }

  async function readRegistered(): Promise<StatusBarRegisteredState> {
    const v = (await deps.state.get(STATE_KEYS.statusBarRegistered)) as
      | StatusBarRegisteredState
      | null;
    return v ?? DEFAULT_REGISTERED;
  }

  async function writeRegistered(next: StatusBarRegisteredState): Promise<void> {
    await deps.state.set(STATE_KEYS.statusBarRegistered, next);
  }

  async function clearError(): Promise<void> {
    await deps.state.set(STATE_KEYS.statusBarLastError, '');
  }

  async function setError(msg: string): Promise<void> {
    await deps.state.set(STATE_KEYS.statusBarLastError, msg);
  }

  async function buildAndRegisterCoffee(): Promise<void> {
    const tray = await readTray();
    const tree = {
      id: COFFEE_ID,
      icon: coffeeConfig.icon,
      text: coffeeConfig.tooltip,
      onClick: ({ itemPath }: { itemPath: string[] }) => {
        void recordClick(itemPath, 'top-level click (tray icon)');
      },
      submenu: [
        {
          id: 'playback',
          text: 'Playback',
          submenu: [
            {
              id: 'play',
              text: 'Playing',
              checked: tray.playing,
              onClick: async ({
                itemPath,
                checked,
              }: {
                itemPath: string[];
                checked?: boolean;
              }) => {
                const next = checked ?? !(await readTray()).playing;
                await writeTray({ ...(await readTray()), playing: next });
                await recordClick(itemPath, `play → ${next}`, checked);
                await buildAndRegisterCoffee();
              },
            },
            {
              id: 'mute',
              text: 'Muted',
              checked: tray.muted,
              onClick: async ({
                itemPath,
                checked,
              }: {
                itemPath: string[];
                checked?: boolean;
              }) => {
                const next = checked ?? !(await readTray()).muted;
                await writeTray({ ...(await readTray()), muted: next });
                await recordClick(itemPath, `mute → ${next}`, checked);
                await buildAndRegisterCoffee();
              },
            },
          ],
        },
        { separator: true as const },
        {
          id: 'volume',
          text: `Volume: ${tray.volumeLevel}`,
          submenu: (['low', 'medium', 'high'] as const).map((level) => ({
            id: level,
            text: level === 'low' ? 'Low (33%)' : level === 'medium' ? 'Medium (66%)' : 'High (100%)',
            onClick: async ({ itemPath }: { itemPath: string[] }) => {
              await writeTray({ ...(await readTray()), volumeLevel: level });
              await recordClick(itemPath, `volume → ${level}`);
              await buildAndRegisterCoffee();
            },
          })),
        },
        { separator: true as const },
        {
          id: 'disabled-demo',
          text: 'Disabled item (for demo)',
          enabled: false,
        },
        {
          id: 'quit-coffee',
          text: 'Unregister Coffee',
          onClick: async ({ itemPath }: { itemPath: string[] }) => {
            await recordClick(itemPath, 'quit-coffee → unregister');
            await doUnregisterCoffee();
          },
        },
      ],
    };
    await (deps.statusBar.registerItem(tree) as unknown as Promise<void>);
  }

  async function doUnregisterCoffee(): Promise<void> {
    try {
      await (deps.statusBar.unregisterItem(COFFEE_ID) as unknown as Promise<void>);
    } catch {
      // ignore
    }
    const cur = await readRegistered();
    await writeRegistered({ ...cur, coffee: false });
  }

  return {
    async registerCoffee(icon, tooltip) {
      coffeeConfig = { icon, tooltip };
      try {
        await buildAndRegisterCoffee();
        const cur = await readRegistered();
        await writeRegistered({ ...cur, coffee: true });
        await clearError();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        await setError(msg);
        const cur = await readRegistered();
        await writeRegistered({ ...cur, coffee: false });
        throw err;
      }
    },

    async unregisterCoffee() {
      await doUnregisterCoffee();
    },

    async registerMusic() {
      try {
        await (deps.statusBar.registerItem({
          id: MUSIC_ID,
          icon: '♪',
          text: '♪ In Rainbows — Radiohead',
          onClick: ({ itemPath }: { itemPath: string[] }) => {
            void recordClick(itemPath, 'music: top-level (no submenu)');
          },
        }) as unknown as Promise<void>);
        const cur = await readRegistered();
        await writeRegistered({ ...cur, music: true });
        await clearError();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        await setError(msg);
        const cur = await readRegistered();
        await writeRegistered({ ...cur, music: false });
        throw err;
      }
    },

    async unregisterMusic() {
      try {
        await (deps.statusBar.unregisterItem(MUSIC_ID) as unknown as Promise<void>);
      } catch {
        // ignore
      }
      const cur = await readRegistered();
      await writeRegistered({ ...cur, music: false });
    },

    async tryInvalid() {
      // Intentionally malformed — no icon; the host validator should throw.
      try {
        await (deps.statusBar.registerItem({
          id: 'bad-demo',
          text: 'This will fail',
        } as Parameters<IStatusBarService['registerItem']>[0]) as unknown as Promise<void>);
        return 'Unexpected: invalid payload slipped through validation';
      } catch (err: unknown) {
        return err instanceof Error ? err.message : String(err);
      }
    },

    async bootFromState() {
      const registered = await readRegistered();
      if (registered.coffee) {
        try {
          await buildAndRegisterCoffee();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          await setError(msg);
        }
      }
      if (registered.music) {
        try {
          await (deps.statusBar.registerItem({
            id: MUSIC_ID,
            icon: '♪',
            text: '♪ In Rainbows — Radiohead',
            onClick: ({ itemPath }: { itemPath: string[] }) => {
              void recordClick(itemPath, 'music: top-level (no submenu)');
            },
          }) as unknown as Promise<void>);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          await setError(msg);
        }
      }
    },

    async shutdown() {
      // Best-effort: leave state flags intact so boot can re-register. The
      // host tears the tray items down on disable / uninstall independently.
    },
  };
}
