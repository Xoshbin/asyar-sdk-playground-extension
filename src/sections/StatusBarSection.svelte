<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { svc, statusBar, type StatusBarClickLogEntry } from '../store';

  let log = $state<StatusBarClickLogEntry[]>([...statusBar.log]);
  let coffeeRegistered = $state(statusBar.coffeeRegistered);
  let musicRegistered = $state(statusBar.musicRegistered);
  let lastError = $state(statusBar.lastError);

  let message = $state('');
  let messageOk = $state(true);

  let coffeeIcon = $state('☕');
  let coffeeTooltip = $state('Coffee — SDK Playground');
  let playing = $state(false);
  let muted = $state(false);
  let volumeLevel = $state<'low' | 'medium' | 'high'>('medium');

  const COFFEE_ID = 'coffee-pot';
  const MUSIC_ID = 'sdk-music';

  function note(msg: string, ok = true) {
    message = msg;
    messageOk = ok;
  }

  function formatClock(d: Date): string {
    return d.toLocaleTimeString(undefined, {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  function recordClick(itemPath: string[], checked: boolean | undefined, label: string) {
    statusBar.record({
      timestamp: new Date(),
      itemPath,
      checked,
      note: label,
    });
  }

  function buildCoffeeTree() {
    return {
      id: COFFEE_ID,
      icon: coffeeIcon,
      text: coffeeTooltip,
      onClick: ({ itemPath }: { itemPath: string[] }) => {
        recordClick(itemPath, undefined, 'top-level click (tray icon)');
      },
      submenu: [
        {
          id: 'playback',
          text: 'Playback',
          submenu: [
            {
              id: 'play',
              text: 'Playing',
              checked: playing,
              onClick: ({ itemPath, checked }: { itemPath: string[]; checked?: boolean }) => {
                playing = checked ?? !playing;
                recordClick(itemPath, checked, `play → ${playing}`);
                void registerCoffee();
              },
            },
            {
              id: 'mute',
              text: 'Muted',
              checked: muted,
              onClick: ({ itemPath, checked }: { itemPath: string[]; checked?: boolean }) => {
                muted = checked ?? !muted;
                recordClick(itemPath, checked, `mute → ${muted}`);
                void registerCoffee();
              },
            },
          ],
        },
        { separator: true as const },
        {
          id: 'volume',
          text: `Volume: ${volumeLevel}`,
          submenu: [
            {
              id: 'low',
              text: 'Low (33%)',
              onClick: ({ itemPath }: { itemPath: string[] }) => {
                volumeLevel = 'low';
                recordClick(itemPath, undefined, 'volume → low');
                void registerCoffee();
              },
            },
            {
              id: 'medium',
              text: 'Medium (66%)',
              onClick: ({ itemPath }: { itemPath: string[] }) => {
                volumeLevel = 'medium';
                recordClick(itemPath, undefined, 'volume → medium');
                void registerCoffee();
              },
            },
            {
              id: 'high',
              text: 'High (100%)',
              onClick: ({ itemPath }: { itemPath: string[] }) => {
                volumeLevel = 'high';
                recordClick(itemPath, undefined, 'volume → high');
                void registerCoffee();
              },
            },
          ],
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
          onClick: ({ itemPath }: { itemPath: string[] }) => {
            recordClick(itemPath, undefined, 'quit-coffee → unregister');
            void unregisterCoffee();
          },
        },
      ],
    };
  }

  async function registerCoffee() {
    try {
      // registerItem is now async and will surface Rust-side errors
      // (validation / serde deserialize / build failures) back here.
      await (svc.statusBar.registerItem(buildCoffeeTree()) as unknown as Promise<void>);
      statusBar.setRegistered('coffee', true);
      statusBar.setError('');
      note(`✓ registered '${COFFEE_ID}' — look for ${coffeeIcon} in the menu bar`);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      statusBar.setRegistered('coffee', false);
      statusBar.setError(msg);
      note(`registerItem failed: ${msg}`, false);
    }
  }

  async function unregisterCoffee() {
    try {
      await (svc.statusBar.unregisterItem(COFFEE_ID) as unknown as Promise<void>);
      statusBar.setRegistered('coffee', false);
      note(`✓ unregisterItem('${COFFEE_ID}') dispatched`);
    } catch (e: any) {
      note(`unregisterItem failed: ${e?.message ?? e}`, false);
    }
  }

  async function registerMusic() {
    try {
      await (svc.statusBar.registerItem({
        id: MUSIC_ID,
        icon: '♪',
        text: '♪ In Rainbows — Radiohead',
        onClick: ({ itemPath }) => {
          recordClick(itemPath, undefined, 'music: top-level (no submenu)');
        },
      }) as unknown as Promise<void>);
      statusBar.setRegistered('music', true);
      statusBar.setError('');
      note(`✓ registered '${MUSIC_ID}' (no submenu — click fires onClick directly)`);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      statusBar.setRegistered('music', false);
      statusBar.setError(msg);
      note(`music registerItem failed: ${msg}`, false);
    }
  }

  async function unregisterMusic() {
    try {
      await (svc.statusBar.unregisterItem(MUSIC_ID) as unknown as Promise<void>);
      statusBar.setRegistered('music', false);
      note(`✓ unregisterItem('${MUSIC_ID}') dispatched`);
    } catch (e: any) {
      note(`unregisterItem failed: ${e?.message ?? e}`, false);
    }
  }

  function tryInvalidRegistration() {
    try {
      svc.statusBar.registerItem({
        id: 'bad-demo',
        text: 'This will fail',
      } as any);
      note('Unexpected: invalid payload slipped through validation', false);
    } catch (e: any) {
      note(`✓ validator caught invalid item — ${e?.message ?? e}`);
    }
  }

  onMount(() => {
    const off = statusBar.subscribe(() => {
      log = [...statusBar.log];
      coffeeRegistered = statusBar.coffeeRegistered;
      musicRegistered = statusBar.musicRegistered;
      lastError = statusBar.lastError;
    });
    onDestroy(off);
  });
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">Status Bar Service — Independent Tray Icons</span>
      <span class="section-desc">
        Each top-level <code>IStatusBarItem</code> becomes its own menu-bar tray
        icon (Raycast <code>MenuBarExtra</code> model). Asyar's own tray stays
        separate. Register one or both demos below, then click through the
        dropdown to watch the <code>itemPath</code> / <code>checked</code>
        payload flow back into the click log.
      </span>
    </div>
  </header>

  <div class="demo-block">
    <div class="demo-head">
      <span class="demo-title">Coffee-pot demo</span>
      <span class="pill" class:on={coffeeRegistered}>
        {coffeeRegistered ? 'registered' : 'not registered'}
      </span>
    </div>

    <div class="field-row">
      <div class="field">
        <span class="field-label">Icon (emoji / label)</span>
        <input class="field-input" type="text" bind:value={coffeeIcon} />
      </div>
      <div class="field">
        <span class="field-label">Tooltip</span>
        <input class="field-input" type="text" bind:value={coffeeTooltip} />
      </div>
    </div>

    <div class="btn-row">
      <button class="action-btn" onclick={() => void registerCoffee()}>
        <span class="btn-icon">🍳</span>
        <span class="btn-text">
          <span class="btn-name">Register / Update</span>
          <span class="btn-hint">statusBar.registerItem(tree)</span>
        </span>
      </button>
      <button
        class="action-btn danger"
        onclick={() => void unregisterCoffee()}
        disabled={!coffeeRegistered}
      >
        <span class="btn-icon">🗑️</span>
        <span class="btn-text">
          <span class="btn-name">Unregister</span>
          <span class="btn-hint">statusBar.unregisterItem(id)</span>
        </span>
      </button>
    </div>

    <div class="state-row">
      <span class="state-pill" class:on={playing}>playing: {playing}</span>
      <span class="state-pill" class:on={muted}>muted: {muted}</span>
      <span class="state-pill on">volume: {volumeLevel}</span>
    </div>
  </div>

  <div class="demo-block">
    <div class="demo-head">
      <span class="demo-title">Music demo (no submenu, top-level onClick)</span>
      <span class="pill" class:on={musicRegistered}>
        {musicRegistered ? 'registered' : 'not registered'}
      </span>
    </div>

    <div class="btn-row">
      <button class="action-btn" onclick={() => void registerMusic()}>
        <span class="btn-icon">🎧</span>
        <span class="btn-text">
          <span class="btn-name">Register ♪ icon</span>
          <span class="btn-hint">appears next to Coffee in the menu bar</span>
        </span>
      </button>
      <button
        class="action-btn danger"
        onclick={() => void unregisterMusic()}
        disabled={!musicRegistered}
      >
        <span class="btn-icon">🗑️</span>
        <span class="btn-text">
          <span class="btn-name">Unregister</span>
          <span class="btn-hint">unregisterItem('{MUSIC_ID}')</span>
        </span>
      </button>
    </div>
  </div>

  <div class="demo-block">
    <div class="demo-head">
      <span class="demo-title">Client-side validator</span>
    </div>
    <button class="action-btn" onclick={tryInvalidRegistration}>
      <span class="btn-icon">🚫</span>
      <span class="btn-text">
        <span class="btn-name">Try to register an item with no icon</span>
        <span class="btn-hint">Should throw before reaching the host</span>
      </span>
    </button>
  </div>

  <div class="output-area">
    <div class="log-head">
      <span class="output-label">CLICK LOG ({log.length})</span>
      <button class="clear-btn" onclick={() => statusBar.clear()}>Clear</button>
    </div>
    {#if log.length === 0}
      <div class="output-body muted">
        No clicks yet. Register the Coffee-pot or Music demo, then click its
        icon in the menu bar (top-right on macOS).
      </div>
    {:else}
      <ul class="log-list">
        {#each [...log].reverse() as entry (entry.timestamp.getTime() + entry.itemPath.join(':'))}
          <li class="log-row">
            <code class="log-time">{formatClock(entry.timestamp)}</code>
            <code class="log-path">
              {entry.itemPath.length ? entry.itemPath.join(' › ') : '(meta)'}
            </code>
            {#if entry.checked !== undefined}
              <span class="log-checked" class:on={entry.checked}>
                checked={entry.checked}
              </span>
            {/if}
            <span class="log-note">{entry.note}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  {#if lastError}
    <div class="output-area">
      <span class="output-label">LAST ERROR (from Rust)</span>
      <div class="output-body err">{lastError}</div>
    </div>
  {/if}

  <div class="output-area">
    <span class="output-label">STATUS</span>
    {#if message}
      <div class="output-body" class:ok={messageOk} class:err={!messageOk}>
        {message}
      </div>
    {:else}
      <div class="output-body muted">
        Register one of the demos above to get started. On macOS an emoji
        renders as a text label in the menu bar (via
        <code>NSStatusItem.title</code>); provide <code>iconPath</code> for a
        proper bitmap.
      </div>
    {/if}
  </div>
</div>

<style>
  @import './section.css';

  .demo-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--separator);
    border-radius: 8px;
  }

  .demo-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .demo-title {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  .pill {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 2px 7px;
    border-radius: 10px;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    opacity: 0.55;
  }

  .pill.on {
    background: color-mix(in srgb, var(--accent-primary) 18%, transparent);
    color: var(--accent-primary);
    opacity: 1;
  }

  .field-row {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 8px;
  }

  .state-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .state-pill {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 10px;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    opacity: 0.5;
    font-family: "SF Mono", "Fira Mono", monospace;
  }

  .state-pill.on {
    background: color-mix(in srgb, var(--accent-primary) 18%, transparent);
    color: var(--accent-primary);
    opacity: 1;
  }

  .log-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .clear-btn {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 6px;
    border: 1px solid var(--separator);
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    cursor: pointer;
  }
  .clear-btn:hover {
    color: var(--text-primary);
    border-color: var(--accent-primary);
  }

  .log-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
    max-height: 220px;
    overflow-y: auto;
  }

  .log-row {
    display: grid;
    grid-template-columns: auto auto auto 1fr;
    gap: 8px;
    align-items: center;
    padding: 5px 8px;
    background: var(--bg-secondary);
    border: 1px solid var(--separator);
    border-left: 3px solid var(--accent-primary);
    border-radius: 6px;
    font-size: 11px;
  }

  .log-time {
    font-family: "SF Mono", "Fira Mono", monospace;
    color: var(--text-secondary);
    opacity: 0.7;
  }

  .log-path {
    font-family: "SF Mono", "Fira Mono", monospace;
    color: var(--text-primary);
    font-weight: 600;
  }

  .log-checked {
    font-size: 10px;
    font-family: "SF Mono", "Fira Mono", monospace;
    padding: 1px 6px;
    border-radius: 10px;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
  }

  .log-checked.on {
    background: color-mix(in srgb, #22c55e 20%, transparent);
    color: #22c55e;
  }

  .log-note {
    font-size: 10px;
    color: var(--text-secondary);
    opacity: 0.7;
  }

  code {
    font-family: 'SF Mono', 'Fira Mono', monospace;
    font-size: 0.95em;
    background: var(--bg-tertiary);
    padding: 1px 4px;
    border-radius: 3px;
  }
</style>
