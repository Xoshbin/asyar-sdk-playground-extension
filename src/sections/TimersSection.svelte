<script lang="ts">
  import type { TimerDescriptor } from 'asyar-sdk';
  import { svc, timerFires, type TimerFireEntry } from '../store';

  let loading = $state(false);
  let output = $state('');
  let outputOk = $state(true);

  // Form state
  let commandId = $state<'timer-ring' | 'timer-snooze'>('timer-ring');
  let secondsFromNow = $state(5);
  let label = $state('Take a break');
  let minutes = $state(5);

  // List state
  let pending = $state<TimerDescriptor[]>([]);

  // Fire-log state (mirrors timerFires store)
  let fires = $state<TimerFireEntry[]>([...timerFires.log]);

  $effect(() => {
    const unsub = timerFires.subscribe(() => {
      fires = [...timerFires.log];
    });
    return unsub;
  });

  function setOutput(msg: string, ok = true) {
    output = msg;
    outputOk = ok;
  }

  function fmtAbs(unixMs: number): string {
    return new Date(unixMs).toLocaleTimeString(undefined, {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  function fmtRel(unixMs: number): string {
    const delta = Math.round((unixMs - Date.now()) / 1000);
    if (delta < 0) return `${-delta}s ago`;
    if (delta < 60) return `in ${delta}s`;
    const m = Math.floor(delta / 60);
    const s = delta % 60;
    return s === 0 ? `in ${m}m` : `in ${m}m${s}s`;
  }

  async function refresh() {
    try {
      pending = await svc.timers.list();
    } catch (e: any) {
      setOutput(`list() error: ${e?.message ?? e}`, false);
    }
  }

  async function schedule() {
    if (secondsFromNow < 1) {
      setOutput('fireAt must be at least 1 second in the future', false);
      return;
    }
    loading = true;
    try {
      const fireAt = Date.now() + secondsFromNow * 1000;
      const args =
        commandId === 'timer-ring'
          ? { label }
          : { minutes };
      const id = await svc.timers.schedule({ commandId, fireAt, args });
      setOutput(`✓ Scheduled ${commandId} — id: ${id.slice(0, 8)}… at ${fmtAbs(fireAt)}`);
      await refresh();
    } catch (e: any) {
      setOutput(`Error: ${e?.message ?? e}`, false);
    } finally {
      loading = false;
    }
  }

  async function cancelOne(id: string) {
    loading = true;
    try {
      await svc.timers.cancel(id);
      setOutput(`✓ Cancelled ${id.slice(0, 8)}…`);
      await refresh();
    } catch (e: any) {
      setOutput(`Error: ${e?.message ?? e}`, false);
    } finally {
      loading = false;
    }
  }

  async function cancelAll() {
    if (pending.length === 0) {
      setOutput('No pending timers to cancel', false);
      return;
    }
    loading = true;
    try {
      const ids = pending.map((t) => t.timerId);
      await Promise.all(ids.map((id) => svc.timers.cancel(id)));
      setOutput(`✓ Cancelled ${ids.length} timer(s)`);
      await refresh();
    } catch (e: any) {
      setOutput(`Error: ${e?.message ?? e}`, false);
    } finally {
      loading = false;
    }
  }

  function clearLog() {
    timerFires.clear();
  }

  $effect(() => {
    refresh();
    // Live-refresh the pending list every 2s so the relative-time hints
    // stay accurate and rows disappear when they fire.
    const int = setInterval(refresh, 2000);
    return () => clearInterval(int);
  });
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">Timer Service</span>
      <span class="section-desc">
        Persistent one-shot timers — Rust persists every schedule to SQLite.
        Timers fire even after the launcher is quit and relaunched. Separate
        permissions per verb: <code>timers:schedule</code>,
        <code>timers:cancel</code>, <code>timers:list</code>.
      </span>
    </div>
  </header>

  <div class="fields">
    <div class="field">
      <span class="field-label">Command to fire</span>
      <select class="field-input" bind:value={commandId}>
        <option value="timer-ring">timer-ring — ⏰ ring</option>
        <option value="timer-snooze">timer-snooze — 💤 snooze</option>
      </select>
    </div>

    <div class="field">
      <span class="field-label">Fire in (seconds)</span>
      <input
        class="field-input"
        type="number"
        min="1"
        max="3600"
        bind:value={secondsFromNow}
      />
      <span class="field-hint">
        Will fire at {fmtAbs(Date.now() + secondsFromNow * 1000)} (in {secondsFromNow}s).
      </span>
    </div>

    {#if commandId === 'timer-ring'}
      <div class="field">
        <span class="field-label">args.label</span>
        <input
          class="field-input"
          type="text"
          bind:value={label}
          placeholder="what the ring is for…"
        />
      </div>
    {:else}
      <div class="field">
        <span class="field-label">args.minutes</span>
        <input
          class="field-input"
          type="number"
          min="1"
          max="60"
          bind:value={minutes}
        />
      </div>
    {/if}
  </div>

  <div class="btn-row">
    <button class="action-btn" onclick={schedule} disabled={loading}>
      <span class="btn-icon">➕</span>
      <span class="btn-text">
        <span class="btn-name">Schedule Timer</span>
        <span class="btn-hint">timers.schedule(opts)</span>
      </span>
    </button>
    <button class="action-btn" onclick={refresh} disabled={loading}>
      <span class="btn-icon">📋</span>
      <span class="btn-text">
        <span class="btn-name">Refresh List</span>
        <span class="btn-hint">timers.list()</span>
      </span>
    </button>
  </div>

  <div class="btn-row">
    <button
      class="action-btn danger"
      onclick={cancelAll}
      disabled={loading || pending.length === 0}
    >
      <span class="btn-icon">🧹</span>
      <span class="btn-text">
        <span class="btn-name">Cancel All</span>
        <span class="btn-hint">forEach cancel()</span>
      </span>
    </button>
  </div>

  <div class="active-area">
    <span class="output-label">PENDING TIMERS ({pending.length})</span>
    {#if pending.length === 0}
      <div class="output-body muted">
        No pending timers. Schedule one above — the row appears here and
        disappears the moment the Rust scheduler fires it. Close the launcher
        before fire time to prove persistence: the fire still happens at the
        next launch.
      </div>
    {:else}
      <ul class="active-list">
        {#each pending as t (t.timerId)}
          <li class="active-row">
            <div class="active-row-head">
              <code class="token">{t.timerId.slice(0, 8)}…</code>
              <span class="created">{fmtAbs(t.fireAt)} · {fmtRel(t.fireAt)}</span>
            </div>
            <div class="active-row-body">
              <span class="pill on">{t.commandId}</span>
              <span class="args">{JSON.stringify(t.args)}</span>
              <button class="cancel-btn" onclick={() => cancelOne(t.timerId)} disabled={loading}>
                Cancel
              </button>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <div class="log-area">
    <div class="log-header">
      <span class="output-label">FIRE LOG ({fires.length})</span>
      {#if fires.length > 0}
        <button class="clear-btn" onclick={clearLog}>Clear</button>
      {/if}
    </div>
    <div class="log-body">
      {#if fires.length === 0}
        <div class="log-empty">
          No fires yet. Schedule a short timer (say, 5 seconds), then watch
          the row leave "pending" above and show up here when the Rust
          scheduler emits `asyar:timer:fire` and the launcher bridge
          dispatches the command into this iframe.
        </div>
      {:else}
        {#each fires as e}
          <div class="tick-row">
            <span class="tick-time">{e.timestamp.toLocaleTimeString(undefined, { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            <span class="tick-badge badge-scheduled">{e.commandId}</span>
            <span class="tick-args">{e.note}</span>
          </div>
        {/each}
      {/if}
    </div>
  </div>

  <div class="output-area">
    <span class="output-label">OUTPUT</span>
    {#if loading}
      <div class="output-body muted">Working…</div>
    {:else if output}
      <div class="output-body" class:ok={outputOk} class:err={!outputOk}>{output}</div>
    {:else}
      <div class="output-body muted">
        Persist-first-emit-second: the row is marked <code>fired = 1</code> in
        SQLite before the event is emitted, so a crash mid-emit can't cause
        a duplicate fire on the next tick.
      </div>
    {/if}
  </div>
</div>

<style>
  @import './section.css';

  .fields {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .field-hint {
    font-size: 10px;
    color: var(--text-secondary);
    opacity: 0.55;
    margin-top: 2px;
  }

  .active-area {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .active-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .active-row {
    padding: 8px 10px;
    background: var(--bg-secondary);
    border: 1px solid var(--separator);
    border-left: 3px solid var(--accent-primary);
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .active-row-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 11px;
  }

  .token {
    font-family: 'SF Mono', 'Fira Mono', monospace;
    color: var(--text-primary);
    font-weight: 600;
  }

  .created {
    font-size: 10px;
    color: var(--text-secondary);
    opacity: 0.7;
    font-variant-numeric: tabular-nums;
  }

  .active-row-body {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
  }

  .pill {
    padding: 1px 6px;
    border-radius: 10px;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .pill.on {
    background: color-mix(in srgb, var(--accent-primary) 20%, transparent);
    color: var(--accent-primary);
  }

  .args {
    color: var(--text-secondary);
    font-style: italic;
    opacity: 0.8;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: 'SF Mono', 'Fira Mono', monospace;
  }

  .cancel-btn {
    font-size: 10px;
    padding: 2px 8px;
    background: transparent;
    border: 1px solid var(--separator);
    border-radius: 5px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: border-color 0.12s, color 0.12s;
  }
  .cancel-btn:hover:not(:disabled) {
    color: #ef4444;
    border-color: #ef4444;
  }

  .log-area {
    display: flex;
    flex-direction: column;
    gap: 6px;
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
    background: var(--bg-secondary);
    border: 1px solid var(--separator);
    border-radius: 8px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 80px;
    max-height: 180px;
    overflow-y: auto;
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
    font-family: 'SF Mono', 'Fira Mono', monospace;
    font-size: 10px;
    line-height: 1.4;
    padding: 3px 4px;
    border-radius: 4px;
  }

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

  .tick-args {
    color: var(--text-secondary);
    opacity: 0.8;
    word-break: break-all;
  }

  code {
    font-family: 'SF Mono', 'Fira Mono', monospace;
    font-size: 0.95em;
    background: var(--bg-tertiary);
    padding: 1px 4px;
    border-radius: 3px;
  }

  select.field-input {
    cursor: pointer;
  }
</style>
