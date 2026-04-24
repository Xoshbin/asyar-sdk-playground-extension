<script lang="ts">
  import { onMount } from 'svelte';
  import type { ExtensionContext, ExtensionStateProxy } from 'asyar-sdk/view';
  import {
    STATE_KEYS,
    type StatusBarClickLogEntry,
    type StatusBarRegisteredState,
    type StatusBarTrayState,
  } from '../stateKeys';
  import { formatTime } from '../lib/timeFormat';

  interface Props {
    context: ExtensionContext;
  }
  let { context }: Props = $props();

  const stateProxy = $derived(context.getService<ExtensionStateProxy>('state'));

  let log = $state<StatusBarClickLogEntry[]>([]);
  let registered = $state<StatusBarRegisteredState>({ coffee: false, music: false });
  let tray = $state<StatusBarTrayState>({ playing: false, muted: false, volumeLevel: 'medium' });
  let lastError = $state<string>('');

  let message = $state('');
  let messageOk = $state(true);

  let coffeeIcon = $state('☕');
  let coffeeTooltip = $state('Coffee — SDK Playground');

  function note(msg: string, ok = true) {
    message = msg;
    messageOk = ok;
  }

  onMount(() => {
    let active = true;
    const cleanup: Array<() => void | Promise<void>> = [];

    (async () => {
      const [logV, regV, trayV, errV, uLog, uReg, uTray, uErr] = await Promise.all([
        stateProxy.get(STATE_KEYS.logsStatusBarClicks),
        stateProxy.get(STATE_KEYS.statusBarRegistered),
        stateProxy.get(STATE_KEYS.statusBarTray),
        stateProxy.get(STATE_KEYS.statusBarLastError),
        stateProxy.subscribe(STATE_KEYS.logsStatusBarClicks, (v) => {
          if (!active) return;
          log = Array.isArray(v) ? (v as StatusBarClickLogEntry[]) : [];
        }),
        stateProxy.subscribe(STATE_KEYS.statusBarRegistered, (v) => {
          if (!active) return;
          registered = (v as StatusBarRegisteredState | null) ?? { coffee: false, music: false };
        }),
        stateProxy.subscribe(STATE_KEYS.statusBarTray, (v) => {
          if (!active) return;
          tray = (v as StatusBarTrayState | null) ?? { playing: false, muted: false, volumeLevel: 'medium' };
        }),
        stateProxy.subscribe(STATE_KEYS.statusBarLastError, (v) => {
          if (!active) return;
          lastError = typeof v === 'string' ? v : '';
        }),
      ]);

      if (!active) {
        void uLog();
        void uReg();
        void uTray();
        void uErr();
        return;
      }

      log = Array.isArray(logV) ? (logV as StatusBarClickLogEntry[]) : [];
      registered = (regV as StatusBarRegisteredState | null) ?? { coffee: false, music: false };
      tray = (trayV as StatusBarTrayState | null) ?? { playing: false, muted: false, volumeLevel: 'medium' };
      lastError = typeof errV === 'string' ? errV : '';

      cleanup.push(uLog, uReg, uTray, uErr);
    })();

    return () => {
      active = false;
      for (const fn of cleanup) {
        try {
          void fn();
        } catch {
          // Best-effort teardown
        }
      }
    };
  });

  async function registerCoffee() {
    const res = await context.request<{ ok: boolean; error?: string }>(
      'statusBar.registerCoffee',
      { icon: coffeeIcon, tooltip: coffeeTooltip },
    );
    if (res.ok) {
      note(`✓ registered 'coffee-pot' — look for ${coffeeIcon} in the menu bar`);
    } else {
      note(`registerItem failed: ${res.error ?? 'unknown'}`, false);
    }
  }

  async function unregisterCoffee() {
    await context.request('statusBar.unregisterCoffee', {});
    note(`✓ unregisterItem('coffee-pot') dispatched`);
  }

  async function registerMusic() {
    const res = await context.request<{ ok: boolean; error?: string }>(
      'statusBar.registerMusic',
      {},
    );
    if (res.ok) {
      note(`✓ registered 'sdk-music' (no submenu — click fires onClick directly)`);
    } else {
      note(`music registerItem failed: ${res.error ?? 'unknown'}`, false);
    }
  }

  async function unregisterMusic() {
    await context.request('statusBar.unregisterMusic', {});
    note(`✓ unregisterItem('sdk-music') dispatched`);
  }

  async function tryInvalidRegistration() {
    const res = await context.request<{ ok: false; error: string }>(
      'statusBar.tryInvalid',
      {},
    );
    note(`✓ validator caught invalid item — ${res.error}`);
  }

  async function clearLog() {
    await context.request('clearLog', { logKey: STATE_KEYS.logsStatusBarClicks });
  }
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">Status Bar Service — Independent Tray Icons</span>
      <span class="section-desc">
        Each top-level <code>IStatusBarItem</code> becomes its own menu-bar tray
        icon (Raycast <code>MenuBarExtra</code> model). Under the worker/view
        split, the <b>worker</b> owns the tray tree + click callbacks —
        submenu checkboxes survive launcher restart because their state lives
        in the broker.
      </span>
    </div>
  </header>

  <div class="demo-block">
    <div class="demo-head">
      <span class="demo-title">Coffee-pot demo</span>
      <span class="pill" class:on={registered.coffee}>
        {registered.coffee ? 'registered' : 'not registered'}
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
      <button class="action-btn" onclick={registerCoffee}>
        <span class="btn-icon">🍳</span>
        <span class="btn-text">
          <span class="btn-name">Register / Update</span>
          <span class="btn-hint">RPC: statusBar.registerCoffee</span>
        </span>
      </button>
      <button
        class="action-btn danger"
        onclick={unregisterCoffee}
        disabled={!registered.coffee}
      >
        <span class="btn-icon">🗑️</span>
        <span class="btn-text">
          <span class="btn-name">Unregister</span>
          <span class="btn-hint">RPC: statusBar.unregisterCoffee</span>
        </span>
      </button>
    </div>

    <div class="state-row">
      <span class="state-pill" class:on={tray.playing}>playing: {tray.playing}</span>
      <span class="state-pill" class:on={tray.muted}>muted: {tray.muted}</span>
      <span class="state-pill on">volume: {tray.volumeLevel}</span>
    </div>
  </div>

  <div class="demo-block">
    <div class="demo-head">
      <span class="demo-title">Music demo (no submenu, top-level onClick)</span>
      <span class="pill" class:on={registered.music}>
        {registered.music ? 'registered' : 'not registered'}
      </span>
    </div>

    <div class="btn-row">
      <button class="action-btn" onclick={registerMusic}>
        <span class="btn-icon">🎧</span>
        <span class="btn-text">
          <span class="btn-name">Register ♪ icon</span>
          <span class="btn-hint">appears next to Coffee in the menu bar</span>
        </span>
      </button>
      <button
        class="action-btn danger"
        onclick={unregisterMusic}
        disabled={!registered.music}
      >
        <span class="btn-icon">🗑️</span>
        <span class="btn-text">
          <span class="btn-name">Unregister</span>
          <span class="btn-hint">RPC: statusBar.unregisterMusic</span>
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
        <span class="btn-hint">Host returns the Rust error message</span>
      </span>
    </button>
  </div>

  <div class="output-area">
    <div class="log-head">
      <span class="output-label">CLICK LOG ({log.length})</span>
      <button class="clear-btn" onclick={clearLog}>Clear</button>
    </div>
    {#if log.length === 0}
      <div class="output-body muted">
        No clicks yet. Register the Coffee-pot or Music demo, then click its
        icon in the menu bar (top-right on macOS).
      </div>
    {:else}
      <ul class="log-list">
        {#each [...log].reverse() as entry (entry.at + ':' + entry.itemPath.join(':'))}
          <li class="log-row">
            <code class="log-time">{formatTime(entry.at)}</code>
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
        Register one of the demos above to get started. Tray registration
        persists in <code>statusBar.registered</code>; on next launcher boot
        the worker re-registers from that state.
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
