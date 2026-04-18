<script lang="ts">
  import type { Disposer } from 'asyar-sdk';
  import { svc } from '../store';

  type Kind =
    | 'sleep'
    | 'wake'
    | 'lid-open'
    | 'lid-close'
    | 'battery-level-changed'
    | 'power-source-changed';

  interface Row {
    kind: Kind;
    label: string;
    emoji: string;
    dispose: Disposer | null;
    count: number;
    last: string;
  }

  const rows: Row[] = $state([
    { kind: 'sleep',                 label: 'Sleep',          emoji: '😴', dispose: null, count: 0, last: '' },
    { kind: 'wake',                  label: 'Wake',           emoji: '☀️', dispose: null, count: 0, last: '' },
    { kind: 'lid-open',              label: 'Lid Open',       emoji: '💻', dispose: null, count: 0, last: '' },
    { kind: 'lid-close',             label: 'Lid Close',      emoji: '📕', dispose: null, count: 0, last: '' },
    { kind: 'battery-level-changed', label: 'Battery Level',  emoji: '🔋', dispose: null, count: 0, last: '' },
    { kind: 'power-source-changed',  label: 'Power Source',   emoji: '🔌', dispose: null, count: 0, last: '' },
  ]);

  interface LogEntry {
    at: Date;
    kind: Kind;
    payload: string;
  }

  let log = $state<LogEntry[]>([]);

  function fmtTime(d: Date): string {
    return d.toLocaleTimeString(undefined, {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  function push(kind: Kind, payload: string) {
    const row = rows.find((r) => r.kind === kind);
    if (row) {
      row.count += 1;
      row.last = payload;
    }
    log = [...log, { at: new Date(), kind, payload }].slice(-50);
  }

  function toggle(row: Row) {
    if (row.dispose) {
      row.dispose();
      row.dispose = null;
      return;
    }

    // Fresh subscription — wire the correct on* method per kind.
    switch (row.kind) {
      case 'sleep':
        row.dispose = svc.systemEvents.onSystemSleep(() => push('sleep', '(no payload)'));
        break;
      case 'wake':
        row.dispose = svc.systemEvents.onSystemWake(() => push('wake', '(no payload)'));
        break;
      case 'lid-open':
        row.dispose = svc.systemEvents.onLidOpen(() => push('lid-open', '(no payload)'));
        break;
      case 'lid-close':
        row.dispose = svc.systemEvents.onLidClose(() => push('lid-close', '(no payload)'));
        break;
      case 'battery-level-changed':
        row.dispose = svc.systemEvents.onBatteryLevelChange((percent) =>
          push('battery-level-changed', `${percent}%`),
        );
        break;
      case 'power-source-changed':
        row.dispose = svc.systemEvents.onPowerSourceChange((onBattery) =>
          push('power-source-changed', onBattery ? 'on battery' : 'on AC'),
        );
        break;
    }
  }

  function subscribeAll() {
    for (const row of rows) {
      if (!row.dispose) toggle(row);
    }
  }

  function unsubscribeAll() {
    for (const row of rows) {
      if (row.dispose) toggle(row);
    }
  }

  function resetCounts() {
    for (const row of rows) {
      row.count = 0;
      row.last = '';
    }
    log = [];
  }

  // Idempotent dispose for every row — fires when the iframe unloads or the
  // section is unmounted. Prevents leaking subscriptions on the Rust side.
  $effect(() => {
    return () => {
      for (const row of rows) {
        row.dispose?.();
        row.dispose = null;
      }
    };
  });
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">System Events Service</span>
      <span class="section-desc">
        Subscribe to OS-level push events. Flip a toggle to call
        <code>onSystemWake(cb)</code> etc; flip it back to dispose. The SDK
        proxy ref-counts per event kind — check your launcher logs: the second
        toggle of a kind should NOT emit a new
        <code>systemEvents:subscribe</code> RPC.
      </span>
    </div>
  </header>

  <div class="btn-row">
    <button class="action-btn" onclick={subscribeAll}>
      <span class="btn-icon">✅</span>
      <span class="btn-text">
        <span class="btn-name">Subscribe All</span>
        <span class="btn-hint">one RPC per kind</span>
      </span>
    </button>
    <button class="action-btn" onclick={unsubscribeAll}>
      <span class="btn-icon">⛔</span>
      <span class="btn-text">
        <span class="btn-name">Unsubscribe All</span>
        <span class="btn-hint">dispose every listener</span>
      </span>
    </button>
    <button class="action-btn danger" onclick={resetCounts}>
      <span class="btn-icon">🗑️</span>
      <span class="btn-text">
        <span class="btn-name">Reset Counts</span>
        <span class="btn-hint">clear counters + log</span>
      </span>
    </button>
  </div>

  <ul class="rows">
    {#each rows as row (row.kind)}
      <li class="row" class:active={row.dispose !== null}>
        <button class="row-toggle" onclick={() => toggle(row)}>
          <span class="row-emoji">{row.emoji}</span>
          <span class="row-label">{row.label}</span>
          <span class="row-state">{row.dispose ? 'ON' : 'OFF'}</span>
        </button>
        <div class="row-stats">
          <span class="count-pill">{row.count}×</span>
          <span class="last">{row.last || '—'}</span>
        </div>
      </li>
    {/each}
  </ul>

  <div class="output-area">
    <span class="output-label">EVENT LOG (latest 50)</span>
    {#if log.length === 0}
      <div class="output-body muted">
        No events yet. Toggle a kind above, then trigger it from your OS
        (Control Center → Battery, close the lid, pull the power cord, or just
        wait — battery ticks arrive every ~30s on macOS).
      </div>
    {:else}
      <div class="output-body">
        {#each log.slice().reverse() as entry}
          {fmtTime(entry.at)} · {entry.kind} · {entry.payload}
{'\n'}
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  @import './section.css';

  .rows {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .row {
    display: flex;
    align-items: stretch;
    background: var(--bg-secondary);
    border: 1px solid var(--separator);
    border-radius: 7px;
    overflow: hidden;
    transition: border-color 0.15s;
  }

  .row.active {
    border-color: var(--accent-primary);
    border-left-width: 3px;
  }

  .row-toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    padding: 9px 12px;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    color: var(--text-primary);
  }

  .row-toggle:hover {
    background: var(--bg-hover);
  }

  .row-emoji {
    font-size: 14px;
  }

  .row-label {
    font-size: 12px;
    font-weight: 600;
    flex: 1;
  }

  .row-state {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    padding: 2px 6px;
    border-radius: 10px;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    opacity: 0.55;
  }

  .row.active .row-state {
    background: color-mix(in srgb, var(--accent-primary) 20%, transparent);
    color: var(--accent-primary);
    opacity: 1;
  }

  .row-stats {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    border-left: 1px solid var(--separator);
    min-width: 140px;
    justify-content: flex-start;
  }

  .count-pill {
    font-family: 'SF Mono', 'Fira Mono', monospace;
    font-size: 11px;
    font-weight: 700;
    color: var(--accent-primary);
    opacity: 0.85;
  }

  .last {
    font-family: 'SF Mono', 'Fira Mono', monospace;
    font-size: 10px;
    color: var(--text-secondary);
    opacity: 0.7;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  code {
    font-family: 'SF Mono', 'Fira Mono', monospace;
    font-size: 0.95em;
    background: var(--bg-tertiary);
    padding: 1px 4px;
    border-radius: 3px;
  }
</style>
