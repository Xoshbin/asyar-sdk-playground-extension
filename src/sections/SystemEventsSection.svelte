<script lang="ts">
  import { onMount } from 'svelte';
  import type { ExtensionContext, ExtensionStateProxy } from 'asyar-sdk/view';
  import {
    STATE_KEYS,
    type CounterMap,
    type SystemEventKind,
    type SystemEventLogEntry,
  } from '../stateKeys';
  import { formatTime } from '../lib/timeFormat';

  interface Props {
    context: ExtensionContext;
  }
  let { context }: Props = $props();

  type KindRow = {
    kind: SystemEventKind;
    label: string;
    emoji: string;
  };

  const rows: readonly KindRow[] = [
    { kind: 'sleep',                 label: 'Sleep',         emoji: '😴' },
    { kind: 'wake',                  label: 'Wake',          emoji: '☀️' },
    { kind: 'lid-open',              label: 'Lid Open',      emoji: '💻' },
    { kind: 'lid-close',             label: 'Lid Close',     emoji: '📕' },
    { kind: 'battery-level-changed', label: 'Battery Level', emoji: '🔋' },
    { kind: 'power-source-changed',  label: 'Power Source',  emoji: '🔌' },
  ];

  let enabled = $state<Partial<Record<SystemEventKind, boolean>>>({});
  let counters = $state<CounterMap<SystemEventKind>>({} as CounterMap<SystemEventKind>);
  let log = $state<SystemEventLogEntry[]>([]);

  const stateProxy = $derived(context.getService<ExtensionStateProxy>('state'));

  onMount(() => {
    let active = true;
    const cleanup: Array<() => void | Promise<void>> = [];

    (async () => {
      const [subs, cnt, lg, uSubs, uCnt, uLog] = await Promise.all([
        stateProxy.get(STATE_KEYS.subsSystemEvents),
        stateProxy.get(STATE_KEYS.countersSystemEvents),
        stateProxy.get(STATE_KEYS.logsSystemEvents),
        stateProxy.subscribe(STATE_KEYS.subsSystemEvents, (v) => {
          if (!active) return;
          enabled = (v as Partial<Record<SystemEventKind, boolean>> | null) ?? {};
        }),
        stateProxy.subscribe(STATE_KEYS.countersSystemEvents, (v) => {
          if (!active) return;
          counters = (v as CounterMap<SystemEventKind> | null) ?? ({} as CounterMap<SystemEventKind>);
        }),
        stateProxy.subscribe(STATE_KEYS.logsSystemEvents, (v) => {
          if (!active) return;
          log = Array.isArray(v) ? (v as SystemEventLogEntry[]) : [];
        }),
      ]);

      if (!active) {
        void uSubs();
        void uCnt();
        void uLog();
        return;
      }

      enabled = (subs as Partial<Record<SystemEventKind, boolean>> | null) ?? {};
      counters = (cnt as CounterMap<SystemEventKind> | null) ?? ({} as CounterMap<SystemEventKind>);
      log = Array.isArray(lg) ? (lg as SystemEventLogEntry[]) : [];

      cleanup.push(uSubs, uCnt, uLog);
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

  async function toggle(kind: SystemEventKind) {
    const next = !(enabled[kind] === true);
    await context.request('toggleSubscription', {
      surface: 'systemEvents',
      kind,
      enabled: next,
    });
  }

  async function subscribeAll() {
    for (const row of rows) {
      if (!(enabled[row.kind] === true)) {
        await context.request('toggleSubscription', {
          surface: 'systemEvents',
          kind: row.kind,
          enabled: true,
        });
      }
    }
  }

  async function unsubscribeAll() {
    for (const row of rows) {
      if (enabled[row.kind] === true) {
        await context.request('toggleSubscription', {
          surface: 'systemEvents',
          kind: row.kind,
          enabled: false,
        });
      }
    }
  }

  async function resetCounts() {
    await context.request('resetCounters', { surface: 'systemEvents' });
    await context.request('clearLog', { logKey: STATE_KEYS.logsSystemEvents });
  }

  function countFor(kind: SystemEventKind): number {
    return counters[kind]?.count ?? 0;
  }
  function lastFor(kind: SystemEventKind): string {
    return counters[kind]?.last ?? '';
  }
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">System Events Service</span>
      <span class="section-desc">
        Worker-owned push subscriptions. Flip a toggle to dispatch
        <code>toggleSubscription</code> to the worker — the subscription
        installs in the worker iframe and its state survives view-iframe
        Dormant. Events keep landing in <code>logs.systemEvents</code> even
        while the launcher is dismissed.
      </span>
    </div>
  </header>

  <div class="btn-row">
    <button class="action-btn" onclick={subscribeAll}>
      <span class="btn-icon">✅</span>
      <span class="btn-text">
        <span class="btn-name">Subscribe All</span>
        <span class="btn-hint">one toggle per kind</span>
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
      <li class="row" class:active={enabled[row.kind] === true}>
        <button class="row-toggle" onclick={() => toggle(row.kind)}>
          <span class="row-emoji">{row.emoji}</span>
          <span class="row-label">{row.label}</span>
          <span class="row-state">{enabled[row.kind] === true ? 'ON' : 'OFF'}</span>
        </button>
        <div class="row-stats">
          <span class="count-pill">{countFor(row.kind)}×</span>
          <span class="last">{lastFor(row.kind) || '—'}</span>
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
          {formatTime(entry.at)} · {entry.kind} · {entry.payload}
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
