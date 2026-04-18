<script lang="ts">
  import { svc, scheduling, type TickEvent } from '../store';

  let ticks = $state<TickEvent[]>([...scheduling.log]);
  let log = $state<HTMLElement | null>(null);

  $effect(() => {
    const unsub = scheduling.subscribe((event) => {
      ticks = [...ticks, event].slice(-50);
    });
    return unsub;
  });

  $effect(() => {
    // scroll log to bottom whenever ticks change
    ticks;
    if (log) log.scrollTop = log.scrollHeight;
  });

  function formatTime(d: Date): string {
    return d.toLocaleTimeString(undefined, { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function clear() {
    scheduling.log = [];
    ticks = [];
  }

  function simulateTick() {
    // Fires the same code path that the platform scheduler uses,
    // but without the scheduledTick flag so it's distinguishable in the log.
    scheduling.recordTick('tick-test', { scheduledTick: false, source: 'manual' });
  }

  async function simulateAndToast() {
    scheduling.recordTick('tick-test', { scheduledTick: false, source: 'manual' });
    await svc.feedback.showToast({
      title: 'Tick recorded',
      message: 'Manual tick added to log (scheduledTick: false)',
      style: 'success',
    });
  }
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">Background Scheduling</span>
      <span class="section-desc">Two scheduled commands: tick-test (60 s) and tick-test-fast (10 s, the new floor)</span>
    </div>
  </header>

  <!-- Stats row -->
  <div class="stats-row">
    <div class="stat">
      <span class="stat-value">{ticks.filter(t => t.commandId === 'tick-test' && t.isScheduled).length}</span>
      <span class="stat-label">60 s ticks</span>
    </div>
    <div class="stat">
      <span class="stat-value">{ticks.filter(t => t.commandId === 'tick-test-fast' && t.isScheduled).length}</span>
      <span class="stat-label">10 s ticks</span>
    </div>
    <div class="stat">
      <span class="stat-value">
        {ticks.length > 0 ? formatTime(ticks[ticks.length - 1].timestamp) : '—'}
      </span>
      <span class="stat-label">Last tick</span>
    </div>
  </div>

  <!-- Action buttons -->
  <div class="btn-row">
    <button class="action-btn" onclick={simulateTick}>
      <span class="btn-icon">⚡</span>
      <span class="btn-text">
        <span class="btn-name">Simulate Tick</span>
        <span class="btn-hint">{'recordTick({scheduledTick: false})'}</span>
      </span>
    </button>
    <button class="action-btn" onclick={simulateAndToast}>
      <span class="btn-icon">🍞</span>
      <span class="btn-text">
        <span class="btn-name">Tick + Toast</span>
        <span class="btn-hint">recordTick + feedback.showToast()</span>
      </span>
    </button>
  </div>

  <!-- Tick log -->
  <div class="log-area">
    <div class="log-header">
      <span class="output-label">TICK LOG</span>
      {#if ticks.length > 0}
        <button class="clear-btn" onclick={clear}>Clear</button>
      {/if}
    </div>
    <div class="log-body" bind:this={log}>
      {#if ticks.length === 0}
        <div class="log-empty">
          No ticks yet. Use "Simulate Tick" for an instant test, or wait — tick-test-fast should fire within 10 s, tick-test within 60 s. Watch for the SCHEDULER badge to confirm a real platform tick.
        </div>
      {:else}
        {#each ticks as tick}
          <div class="tick-row" class:scheduled={tick.isScheduled}>
            <span class="tick-time">{formatTime(tick.timestamp)}</span>
            <span class="tick-badge" class:badge-scheduled={tick.isScheduled} class:badge-manual={!tick.isScheduled}>
              {tick.isScheduled ? 'SCHEDULER' : 'MANUAL'}
            </span>
            <span class="tick-cmd" class:cmd-fast={tick.commandId === 'tick-test-fast'}>
              {tick.commandId === 'tick-test-fast' ? '10s' : '60s'}
            </span>
            <span class="tick-args">{JSON.stringify(tick.args)}</span>
          </div>
        {/each}
      {/if}
    </div>
  </div>

  <p class="note">
    Two commands in <code>manifest.json</code> declare schedules:
    <code>tick-test</code> at <code>intervalSeconds: 60</code> and
    <code>tick-test-fast</code> at <code>intervalSeconds: 10</code> — the new platform floor.
    The platform (Rust tokio) owns both timers; your extension receives normal
    <code>executeCommand()</code> calls with <code>{"{ scheduledTick: true }"}</code> in args.
    Scheduled ticks keep firing whether or not the launcher window is visible.
  </p>
</div>

<style>
  @import './section.css';

  /* Stats row */
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

  /* Log */
  .log-area {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
    min-height: 0;
  }

  .log-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .clear-btn {
    font-size: 10px;
    padding: 2px 8px;
    background: transparent;
    border: 1px solid var(--separator);
    border-radius: 5px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: border-color 0.12s, color 0.12s;
  }
  .clear-btn:hover { color: var(--text-primary); border-color: var(--accent-primary); }

  .log-body {
    flex: 1;
    overflow-y: auto;
    background: var(--bg-secondary);
    border: 1px solid var(--separator);
    border-radius: 8px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 80px;
    scrollbar-width: thin;
    scrollbar-color: var(--separator) transparent;
  }

  .log-empty {
    font-size: 10px;
    color: var(--text-secondary);
    opacity: 0.45;
    font-style: italic;
    line-height: 1.5;
    margin: auto;
    text-align: center;
    padding: 8px;
  }

  .tick-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: "SF Mono", "Fira Mono", monospace;
    font-size: 10px;
    line-height: 1.4;
    padding: 3px 4px;
    border-radius: 4px;
    transition: background 0.1s;
  }
  .tick-row.scheduled { background: color-mix(in srgb, #22c55e 6%, transparent); }

  .tick-time {
    color: var(--text-secondary);
    opacity: 0.55;
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }

  .tick-badge {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.05em;
    padding: 1px 5px;
    border-radius: 3px;
    flex-shrink: 0;
  }
  .badge-scheduled {
    background: color-mix(in srgb, #22c55e 15%, transparent);
    color: #22c55e;
  }
  .badge-manual {
    background: color-mix(in srgb, #f59e0b 12%, transparent);
    color: #f59e0b;
  }

  .tick-cmd {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.04em;
    padding: 1px 5px;
    border-radius: 3px;
    flex-shrink: 0;
    background: color-mix(in srgb, var(--text-secondary) 12%, transparent);
    color: var(--text-secondary);
  }
  .tick-cmd.cmd-fast {
    background: color-mix(in srgb, #3b82f6 14%, transparent);
    color: #3b82f6;
  }

  .tick-args {
    color: var(--text-secondary);
    opacity: 0.7;
    word-break: break-all;
  }

  /* Note */
  .note {
    font-size: 10px;
    color: var(--text-secondary);
    opacity: 0.55;
    line-height: 1.5;
    margin: 0;
  }

  .note code {
    font-family: "SF Mono", "Fira Mono", monospace;
    font-size: 9.5px;
    background: var(--bg-tertiary);
    padding: 1px 4px;
    border-radius: 3px;
  }
</style>
