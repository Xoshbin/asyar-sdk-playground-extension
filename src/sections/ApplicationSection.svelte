<script lang="ts">
  import { onMount } from 'svelte';
  import type {
    ExtensionContext,
    ExtensionStateProxy,
    FrontmostApplication,
    IApplicationService,
  } from 'asyar-sdk/view';
  import {
    STATE_KEYS,
    type ApplicationLogEntry,
    type ApplicationPushKind,
    type CounterMap,
  } from '../stateKeys';
  import { formatTime } from '../lib/timeFormat';

  interface Props {
    context: ExtensionContext;
  }
  let { context }: Props = $props();

  const applicationService = $derived(context.getService<IApplicationService>('application'));
  const stateProxy = $derived(context.getService<ExtensionStateProxy>('state'));

  // ── query surface (view-driven, direct proxy) ──────────────────────────
  let loadingFront = $state(false);
  let front = $state<FrontmostApplication | null>(null);
  let queryError = $state('');

  let bundleId = $state('com.apple.Safari');
  let isRunningResult = $state<boolean | null>(null);
  let isRunningBusy = $state(false);
  let isRunningError = $state('');

  async function getFrontmost() {
    loadingFront = true;
    queryError = '';
    try {
      front = await applicationService.getFrontmostApplication();
    } catch (e: any) {
      queryError = e.code ?? e.message ?? String(e);
      front = null;
    } finally {
      loadingFront = false;
    }
  }

  async function checkIsRunning() {
    if (!bundleId.trim()) return;
    isRunningBusy = true;
    isRunningError = '';
    try {
      isRunningResult = await applicationService.isRunning(bundleId.trim());
    } catch (e: any) {
      isRunningError = e.code ?? e.message ?? String(e);
      isRunningResult = null;
    } finally {
      isRunningBusy = false;
    }
  }

  // ── push surface (worker-owned, state broker) ──────────────────────────
  type KindRow = {
    kind: ApplicationPushKind;
    label: string;
    emoji: string;
  };

  const rows: readonly KindRow[] = [
    { kind: 'launched',          label: 'Launched',          emoji: '🚀' },
    { kind: 'terminated',        label: 'Terminated',        emoji: '💀' },
    { kind: 'frontmost-changed', label: 'Frontmost Changed', emoji: '🎯' },
  ];

  let enabled = $state<Partial<Record<ApplicationPushKind, boolean>>>({});
  let counters = $state<CounterMap<ApplicationPushKind>>({} as CounterMap<ApplicationPushKind>);
  let log = $state<ApplicationLogEntry[]>([]);

  onMount(() => {
    let active = true;
    const cleanup: Array<() => void | Promise<void>> = [];

    (async () => {
      const [subs, cnt, lg, uSubs, uCnt, uLog] = await Promise.all([
        stateProxy.get(STATE_KEYS.subsApplication),
        stateProxy.get(STATE_KEYS.countersApplication),
        stateProxy.get(STATE_KEYS.logsApplication),
        stateProxy.subscribe(STATE_KEYS.subsApplication, (v) => {
          if (!active) return;
          enabled = (v as Partial<Record<ApplicationPushKind, boolean>> | null) ?? {};
        }),
        stateProxy.subscribe(STATE_KEYS.countersApplication, (v) => {
          if (!active) return;
          counters = (v as CounterMap<ApplicationPushKind> | null) ?? ({} as CounterMap<ApplicationPushKind>);
        }),
        stateProxy.subscribe(STATE_KEYS.logsApplication, (v) => {
          if (!active) return;
          log = Array.isArray(v) ? (v as ApplicationLogEntry[]) : [];
        }),
      ]);

      if (!active) {
        void uSubs();
        void uCnt();
        void uLog();
        return;
      }

      enabled = (subs as Partial<Record<ApplicationPushKind, boolean>> | null) ?? {};
      counters = (cnt as CounterMap<ApplicationPushKind> | null) ?? ({} as CounterMap<ApplicationPushKind>);
      log = Array.isArray(lg) ? (lg as ApplicationLogEntry[]) : [];

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

  async function toggle(kind: ApplicationPushKind) {
    const next = !(enabled[kind] === true);
    await context.request('toggleSubscription', {
      surface: 'application',
      kind,
      enabled: next,
    });
  }

  async function subscribeAll() {
    for (const row of rows) {
      if (!(enabled[row.kind] === true)) {
        await context.request('toggleSubscription', {
          surface: 'application',
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
          surface: 'application',
          kind: row.kind,
          enabled: false,
        });
      }
    }
  }

  async function resetCounts() {
    await context.request('resetCounters', { surface: 'application' });
    await context.request('clearLog', { logKey: STATE_KEYS.logsApplication });
  }

  function countFor(kind: ApplicationPushKind): number {
    return counters[kind]?.count ?? 0;
  }
  function lastFor(kind: ApplicationPushKind): string {
    return counters[kind]?.last ?? '';
  }
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">Application Service</span>
      <span class="section-desc">
        Query surface (view-driven, <code>application:*</code>) plus push
        surface (worker-owned, <code>appEvents:*</code>). Push events land in
        <code>logs.application</code> even while the launcher is dismissed.
      </span>
    </div>
  </header>

  <!-- ── Query: getFrontmost ── -->
  <div class="btn-group">
    <button class="action-btn" onclick={getFrontmost} disabled={loadingFront}>
      <span class="btn-icon">🎯</span>
      <span class="btn-text">
        <span class="btn-name">Get Frontmost Application</span>
        <span class="btn-hint">getFrontmostApplication() — one-shot query</span>
      </span>
    </button>
  </div>

  <p class="note">
    <strong>macOS Note:</strong> Window title requires Accessibility
    permissions. If missing, Asyar will open the System Settings panel on the
    first call.
  </p>

  <div class="output-area">
    <span class="output-label">FRONTMOST APP</span>
    {#if loadingFront}
      <div class="output-body muted">Fetching metadata…</div>
    {:else if queryError}
      <div class="output-body err">Error: {queryError}</div>
    {:else if front}
      <div class="output-body ok">
        <div class="app-info">
          <div class="info-row">
            <span class="info-label">Title:</span>
            <span class="info-value">{front.windowTitle || '(empty)'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Name:</span>
            <span class="info-value">{front.name}</span>
          </div>
          <div class="info-row">
            <span class="info-label">ID:</span>
            <span class="info-value"><code>{front.bundleId ?? '—'}</code></span>
          </div>
          <div class="info-row">
            <span class="info-label">Path:</span>
            <span class="info-value"><code>{front.path ?? '—'}</code></span>
          </div>
        </div>
      </div>
    {:else}
      <div class="output-body muted">Press the button above to inspect the frontmost app</div>
    {/if}
  </div>

  <!-- ── Query: isRunning ── -->
  <div class="is-running-row">
    <input
      class="bundle-input"
      type="text"
      placeholder="com.apple.Safari"
      bind:value={bundleId}
    />
    <button class="action-btn compact" onclick={checkIsRunning} disabled={isRunningBusy}>
      <span class="btn-icon">🔎</span>
      <span class="btn-text">
        <span class="btn-name">isRunning()</span>
        <span class="btn-hint">synchronous presence check</span>
      </span>
    </button>
  </div>

  <div class="output-area compact">
    <span class="output-label">isRunning RESULT</span>
    {#if isRunningError}
      <div class="output-body err">Error: {isRunningError}</div>
    {:else if isRunningResult === null}
      <div class="output-body muted">No query yet</div>
    {:else}
      <div class="output-body ok">
        <strong>{bundleId}</strong> is currently
        <span class={isRunningResult ? 'running' : 'not-running'}>
          {isRunningResult ? 'RUNNING' : 'NOT RUNNING'}
        </span>
      </div>
    {/if}
  </div>

  <!-- ── Push: state-broker subscriptions ── -->
  <header class="section-header">
    <div>
      <span class="section-title">Push events</span>
      <span class="section-desc">
        Toggle a kind on to dispatch <code>toggleSubscription</code> to the
        worker. Events land in <code>logs.application</code> and per-kind
        counters, which this view subscribes to.
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
        No events yet. Toggle a kind above, then launch/quit an app or switch
        windows. On Wayland, <code>frontmost-changed</code> will not fire —
        that is by design (no portable protocol).
      </div>
    {:else}
      <div class="output-body">
        {#each log.slice().reverse() as entry}
          {formatTime(entry.at)} · {entry.kind} · {entry.summary}
{'\n'}
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  @import './section.css';

  .is-running-row {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    align-items: stretch;
  }

  .bundle-input {
    flex: 1;
    padding: 0 10px;
    font-size: 12px;
    font-family: 'SF Mono', 'Fira Mono', monospace;
    background: var(--bg-secondary);
    border: 1px solid var(--separator);
    border-radius: 6px;
    color: var(--text-primary);
  }

  .action-btn.compact {
    min-width: 200px;
  }

  .output-area.compact {
    margin-bottom: 16px;
  }

  .running {
    color: #2ea043;
    font-weight: 700;
  }

  .not-running {
    color: var(--text-secondary);
    font-weight: 700;
  }

  .app-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .info-row {
    display: flex;
    gap: 8px;
    font-size: 12px;
  }

  .info-label {
    min-width: 50px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .info-value {
    color: var(--text-primary);
    word-break: break-all;
  }

  code {
    background: var(--bg-secondary);
    padding: 1px 4px;
    border-radius: 4px;
    font-family: var(--font-mono, 'SF Mono', 'Fira Mono', monospace);
    font-size: 0.95em;
  }

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
    min-width: 220px;
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
</style>
