<script lang="ts">
  import { onMount } from 'svelte';
  import type { ExtensionContext, ExtensionStateProxy } from 'asyar-sdk/view';
  import {
    STATE_KEYS,
    type FsWatchActiveState,
    type FsWatchEventLogEntry,
  } from '../stateKeys';
  import { formatTime } from '../lib/timeFormat';

  interface Props {
    context: ExtensionContext;
  }
  let { context }: Props = $props();

  const DEFAULT_PATH = '/tmp/asyar-fs-watch';

  let pathInput = $state(DEFAULT_PATH);
  let active = $state<FsWatchActiveState | null>(null);
  let eventCount = $state(0);
  let lastEvent = $state<FsWatchEventLogEntry | null>(null);
  let log = $state<FsWatchEventLogEntry[]>([]);
  let lastError = $state<string | null>(null);

  const stateProxy = $derived(context.getService<ExtensionStateProxy>('state'));

  const isWatching = $derived(active !== null);

  onMount(() => {
    let alive = true;
    const cleanup: Array<() => void | Promise<void>> = [];

    (async () => {
      const [a, c, l, lg, uA, uC, uL, uLg] = await Promise.all([
        stateProxy.get(STATE_KEYS.fsWatchActive),
        stateProxy.get(STATE_KEYS.fsWatchEventCount),
        stateProxy.get(STATE_KEYS.fsWatchLastEvent),
        stateProxy.get(STATE_KEYS.logsFsWatch),
        stateProxy.subscribe(STATE_KEYS.fsWatchActive, (v) => {
          if (!alive) return;
          active = (v as FsWatchActiveState | null) ?? null;
        }),
        stateProxy.subscribe(STATE_KEYS.fsWatchEventCount, (v) => {
          if (!alive) return;
          eventCount = typeof v === 'number' ? v : 0;
        }),
        stateProxy.subscribe(STATE_KEYS.fsWatchLastEvent, (v) => {
          if (!alive) return;
          lastEvent = (v as FsWatchEventLogEntry | null) ?? null;
        }),
        stateProxy.subscribe(STATE_KEYS.logsFsWatch, (v) => {
          if (!alive) return;
          log = Array.isArray(v) ? (v as FsWatchEventLogEntry[]) : [];
        }),
      ]);

      if (!alive) {
        void uA();
        void uC();
        void uL();
        void uLg();
        return;
      }

      active = (a as FsWatchActiveState | null) ?? null;
      eventCount = typeof c === 'number' ? c : 0;
      lastEvent = (l as FsWatchEventLogEntry | null) ?? null;
      log = Array.isArray(lg) ? (lg as FsWatchEventLogEntry[]) : [];
      if (active?.path) pathInput = active.path;

      cleanup.push(uA, uC, uL, uLg);
    })();

    return () => {
      alive = false;
      for (const fn of cleanup) {
        try {
          void fn();
        } catch {
          // Best-effort teardown
        }
      }
    };
  });

  async function startWatching() {
    lastError = null;
    const result = await context.request<{ ok: boolean; error?: string }>(
      'fsWatch.start',
      { path: pathInput },
    );
    if (!result.ok && result.error) {
      lastError = result.error;
    }
  }

  async function stopWatching() {
    lastError = null;
    await context.request('fsWatch.stop', {});
  }

  async function resetCounters() {
    await context.request('fsWatch.reset', {});
  }
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">FileSystem Watcher Service</span>
      <span class="section-desc">
        Worker-owned <code>fs.watch(...)</code> handle. The view drives
        <code>fsWatch.start</code> / <code>fsWatch.stop</code> RPCs into the
        worker; the worker holds the watcher and writes
        <code>fsWatch.eventCount</code> and <code>fsWatch.lastEvent</code> back
        to state. Push events arrive at the worker iframe (always-on under
        <code>keep_alive: None</code>), so the demo proves the watcher
        survives view Dormant.
      </span>
    </div>
  </header>

  <div class="path-row">
    <label class="path-label">
      <span class="path-label-text">Watch path</span>
      <input
        class="path-input"
        type="text"
        bind:value={pathInput}
        placeholder={DEFAULT_PATH}
        disabled={isWatching}
      />
    </label>
    <span class="path-hint">
      Manifest declares <code>permissionArgs["fs:watch"]: ["/tmp/asyar-fs-watch/**"]</code>.
      Paths outside that pattern are rejected by the host.
    </span>
  </div>

  <div class="btn-row">
    {#if isWatching}
      <button class="action-btn" onclick={stopWatching}>
        <span class="btn-icon">⛔</span>
        <span class="btn-text">
          <span class="btn-name">Stop Watching</span>
          <span class="btn-hint">dispose handle</span>
        </span>
      </button>
    {:else}
      <button class="action-btn" onclick={startWatching}>
        <span class="btn-icon">👁️</span>
        <span class="btn-text">
          <span class="btn-name">Start Watching</span>
          <span class="btn-hint">fs.watch([path])</span>
        </span>
      </button>
    {/if}
    <button class="action-btn danger" onclick={resetCounters}>
      <span class="btn-icon">🗑️</span>
      <span class="btn-text">
        <span class="btn-name">Reset Counters</span>
        <span class="btn-hint">clear count + log</span>
      </span>
    </button>
  </div>

  <ul class="status-rows">
    <li class="status-row" class:active={isWatching}>
      <span class="status-label">Watch state</span>
      <span class="status-value">
        {#if isWatching && active}
          ON · {active.path} · since {formatTime(active.startedAt)}
        {:else}
          OFF
        {/if}
      </span>
    </li>
    <li class="status-row">
      <span class="status-label">Events received</span>
      <span class="status-value mono">{eventCount}×</span>
    </li>
    <li class="status-row">
      <span class="status-label">Last event</span>
      <span class="status-value mono">
        {#if lastEvent}
          {formatTime(lastEvent.at)} · {lastEvent.paths.join(', ')}
        {:else}
          —
        {/if}
      </span>
    </li>
  </ul>

  {#if lastError}
    <div class="error-box">
      <span class="error-label">Last error</span>
      <span class="error-body">{lastError}</span>
    </div>
  {/if}

  <div class="output-area">
    <span class="output-label">EVENT LOG (latest 25)</span>
    {#if log.length === 0}
      <div class="output-body muted">
        No events yet. Start watching, then from a terminal run
        <code>mkdir -p {pathInput} && touch {pathInput}/probe.txt</code> —
        the worker will receive the change and the count above will tick. Try
        dismissing the launcher panel for &gt;5 minutes between watches and
        triggering changes; events arrive at the worker iframe regardless of
        whether the view is Dormant.
      </div>
    {:else}
      <div class="output-body">
        {#each log.slice().reverse() as entry}
          {formatTime(entry.at)} · {entry.paths.join(', ')}
{'\n'}
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  @import './section.css';

  .path-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 8px;
  }

  .path-label {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .path-label-text {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--text-secondary);
    min-width: 80px;
  }

  .path-input {
    flex: 1;
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--separator);
    border-radius: 6px;
    padding: 6px 10px;
    font-family: 'SF Mono', 'Fira Mono', monospace;
    font-size: 12px;
  }

  .path-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .path-hint {
    font-size: 10px;
    color: var(--text-secondary);
    opacity: 0.7;
    padding-left: 90px;
  }

  .status-rows {
    list-style: none;
    padding: 0;
    margin: 8px 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .status-row {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--separator);
    border-radius: 7px;
    padding: 8px 12px;
  }

  .status-row.active {
    border-color: var(--accent-primary);
    border-left-width: 3px;
  }

  .status-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--text-secondary);
    min-width: 120px;
  }

  .status-value {
    font-size: 12px;
    color: var(--text-primary);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mono {
    font-family: 'SF Mono', 'Fira Mono', monospace;
  }

  .error-box {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: color-mix(in srgb, #ff6b6b 12%, var(--bg-secondary));
    border: 1px solid color-mix(in srgb, #ff6b6b 35%, var(--separator));
    border-radius: 7px;
    padding: 8px 12px;
    margin-bottom: 8px;
  }

  .error-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: #ff6b6b;
  }

  .error-body {
    font-family: 'SF Mono', 'Fira Mono', monospace;
    font-size: 11px;
    color: var(--text-primary);
  }

  code {
    font-family: 'SF Mono', 'Fira Mono', monospace;
    font-size: 0.95em;
    background: var(--bg-tertiary);
    padding: 1px 4px;
    border-radius: 3px;
  }
</style>
