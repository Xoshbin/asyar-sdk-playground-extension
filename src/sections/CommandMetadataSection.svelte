<script lang="ts">
  import { scheduling, type TickEvent } from '../store';

  let ticks = $state<TickEvent[]>([...scheduling.log]);

  $effect(() => {
    const unsub = scheduling.subscribe((event) => {
      ticks = [...ticks, event].slice(-50);
    });
    return unsub;
  });

  function formatTime(d: Date): string {
    return d.toLocaleTimeString(undefined, {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  const subtitle = $derived(
    ticks.length > 0
      ? `Ticked ${ticks.length} times · Last: ${formatTime(ticks[ticks.length - 1].timestamp)}`
      : ''
  );
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">Command Metadata</span>
      <span class="section-desc">updateCommandMetadata('tick-test', &#123; subtitle &#125;) — updates search result subtitle on each tick</span>
    </div>
  </header>

  <!-- Current subtitle display -->
  <div class="output-area">
    <span class="output-label">CURRENT SUBTITLE</span>
    {#if subtitle}
      <div class="output-body ok">{subtitle}</div>
    {:else}
      <div class="output-body muted">No ticks yet — wait 60 s for the scheduler, or use the Scheduling tab → Simulate Tick</div>
    {/if}
  </div>

  <!-- Stats row -->
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
        {ticks.length > 0 ? formatTime(ticks[ticks.length - 1].timestamp) : '—'}
      </span>
      <span class="stat-label">Last tick</span>
    </div>
  </div>

  <p class="note">
    This panel updates whenever a tick is recorded — including the Scheduling tab's
    "Simulate Tick" button. However, <strong>the search result subtitle only updates on a real
    60-second scheduler tick</strong> — that is the only path that calls
    <code>executeCommand('tick-test')</code> and triggers <code>updateCommandMetadata()</code>.
    After a scheduler tick fires, close this view and search for
    <code>Scheduling Tick Test</code> to see the subtitle live.
  </p>
</div>

<style>
  @import './section.css';

  /* output-area has margin-top: auto in section.css (pushes it down in flex containers
     where it is the last element). Here it is the first element, so override. */
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
