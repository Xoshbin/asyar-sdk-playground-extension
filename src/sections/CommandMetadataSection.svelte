<script lang="ts">
  import { onMount } from 'svelte';
  import type { ExtensionContext, ExtensionStateProxy } from 'asyar-sdk/view';
  import { STATE_KEYS, type TickEvent } from '../stateKeys';
  import { formatTime } from '../lib/timeFormat';

  interface Props {
    context: ExtensionContext;
  }
  let { context }: Props = $props();

  let ticks = $state<TickEvent[]>([]);
  const stateProxy = $derived(context.getService<ExtensionStateProxy>('state'));

  onMount(() => {
    let active = true;
    const cleanup: Array<() => void | Promise<void>> = [];

    (async () => {
      const [initial, unsub] = await Promise.all([
        stateProxy.get(STATE_KEYS.logsScheduling),
        stateProxy.subscribe(STATE_KEYS.logsScheduling, (v) => {
          if (!active) return;
          ticks = Array.isArray(v) ? (v as TickEvent[]) : [];
        }),
      ]);
      if (!active) {
        void unsub();
        return;
      }
      ticks = Array.isArray(initial) ? (initial as TickEvent[]) : [];
      cleanup.push(unsub);
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

  const subtitle = $derived(
    ticks.length > 0
      ? `Ticked ${ticks.length} times · Last: ${formatTime(ticks[ticks.length - 1].at)}`
      : '',
  );
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">Command Metadata</span>
      <span class="section-desc">updateCommandMetadata('tick-test', &#123; subtitle &#125;) — updates search result subtitle on each tick</span>
    </div>
  </header>

  <div class="output-area">
    <span class="output-label">CURRENT SUBTITLE</span>
    {#if subtitle}
      <div class="output-body ok">{subtitle}</div>
    {:else}
      <div class="output-body muted">No ticks yet — wait 60 s for the scheduler, or use the Scheduling tab → Simulate Tick</div>
    {/if}
  </div>

  <div class="stats-row">
    <div class="stat">
      <span class="stat-value">{ticks.length}</span>
      <span class="stat-label">Total ticks</span>
    </div>
    <div class="stat">
      <span class="stat-value">{ticks.filter(t => t.isScheduled).length}</span>
      <span class="stat-label">Scheduled</span>
    </div>
    <div class="stat">
      <span class="stat-value">
        {ticks.length > 0 ? formatTime(ticks[ticks.length - 1].at) : '—'}
      </span>
      <span class="stat-label">Last tick</span>
    </div>
  </div>

  <p class="note">
    This panel reads the same <code>logs.scheduling</code> state key that the worker writes on
    every tick (scheduled or simulated). The search-result subtitle itself is updated via
    <code>svc.commands.updateCommandMetadata('tick-test', {"{ subtitle }"})</code> inside the
    worker's <code>executeCommand</code> — only <b>real 60-second scheduler ticks</b> drive
    that side effect. Close this view and search for
    <code>Scheduling Tick Test</code> to see it live.
  </p>
</div>

<style>
  @import './section.css';

  .output-area {
    margin-top: 0;
  }

  .stats-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 10px 8px;
    background: var(--bg-secondary);
    border: 1px solid var(--separator);
    border-radius: 8px;
  }

  .stat-value {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
    font-family: "SF Mono", "Fira Mono", monospace;
    letter-spacing: -0.02em;
  }

  .stat-label {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-secondary);
    opacity: 0.5;
  }

  .note code {
    font-family: "SF Mono", "Fira Mono", monospace;
    font-size: 9.5px;
    background: var(--bg-tertiary);
    padding: 1px 4px;
    border-radius: 3px;
  }
</style>
