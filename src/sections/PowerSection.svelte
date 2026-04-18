<script lang="ts">
  import type { ActiveInhibitor } from 'asyar-sdk';
  import { svc } from '../store';

  let loading = $state(false);
  let output = $state('');
  let outputOk = $state(true);
  let reason = $state('SDK Playground demo');
  let system = $state(true);
  let display = $state(false);
  let disk = $state(false);
  let active = $state<ActiveInhibitor[]>([]);

  function setOutput(msg: string, ok = true) {
    output = msg;
    outputOk = ok;
  }

  function fmtTime(unixSeconds: number): string {
    return new Date(unixSeconds * 1000).toLocaleTimeString(undefined, {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  async function keepAwake() {
    loading = true;
    try {
      const token = await svc.power.keepAwake({ system, display, disk, reason });
      setOutput(`✓ Acquired inhibitor — token: ${token}`);
      await refresh();
    } catch (e: any) {
      setOutput(`Error: ${e?.message ?? e}`, false);
    } finally {
      loading = false;
    }
  }

  async function releaseFirst() {
    if (active.length === 0) {
      setOutput('No active inhibitors to release', false);
      return;
    }
    loading = true;
    const token = active[0].token;
    try {
      await svc.power.release(token);
      setOutput(`✓ Released ${token}`);
      await refresh();
    } catch (e: any) {
      setOutput(`Error: ${e?.message ?? e}`, false);
    } finally {
      loading = false;
    }
  }

  async function releaseAll() {
    if (active.length === 0) {
      setOutput('No active inhibitors to release', false);
      return;
    }
    loading = true;
    try {
      const tokens = active.map((i) => i.token);
      await Promise.all(tokens.map((t) => svc.power.release(t)));
      setOutput(`✓ Released ${tokens.length} inhibitor(s)`);
      await refresh();
    } catch (e: any) {
      setOutput(`Error: ${e?.message ?? e}`, false);
    } finally {
      loading = false;
    }
  }

  async function refresh() {
    try {
      active = await svc.power.list();
    } catch (e: any) {
      setOutput(`list() error: ${e?.message ?? e}`, false);
    }
  }

  $effect(() => {
    refresh();
  });
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">Power Service</span>
      <span class="section-desc">
        Prevent OS sleep during long-running work. macOS uses IOKit power
        assertions, Linux uses logind DBus, Windows uses
        <code>SetThreadExecutionState</code>. Tokens survive iframe reload — call
        <b>list()</b> to rediscover.
      </span>
    </div>
  </header>

  <div class="fields">
    <div class="field">
      <span class="field-label">Reason</span>
      <input
        class="field-input"
        type="text"
        bind:value={reason}
        placeholder="shown in OS power panel…"
      />
    </div>

    <div class="toggle-row">
      <label class="toggle">
        <input type="checkbox" bind:checked={system} />
        <span>system</span>
        <span class="toggle-hint">idle sleep</span>
      </label>
      <label class="toggle">
        <input type="checkbox" bind:checked={display} />
        <span>display</span>
        <span class="toggle-hint">keep screen on</span>
      </label>
      <label class="toggle">
        <input type="checkbox" bind:checked={disk} />
        <span>disk</span>
        <span class="toggle-hint">prevent disk idle</span>
      </label>
    </div>
  </div>

  <div class="btn-row">
    <button class="action-btn" onclick={keepAwake} disabled={loading}>
      <span class="btn-icon">☕</span>
      <span class="btn-text">
        <span class="btn-name">Keep Awake</span>
        <span class="btn-hint">power.keepAwake(options)</span>
      </span>
    </button>
    <button class="action-btn" onclick={refresh} disabled={loading}>
      <span class="btn-icon">📋</span>
      <span class="btn-text">
        <span class="btn-name">Refresh List</span>
        <span class="btn-hint">power.list()</span>
      </span>
    </button>
  </div>

  <div class="btn-row">
    <button
      class="action-btn"
      onclick={releaseFirst}
      disabled={loading || active.length === 0}
    >
      <span class="btn-icon">🔓</span>
      <span class="btn-text">
        <span class="btn-name">Release First</span>
        <span class="btn-hint">power.release(tokens[0])</span>
      </span>
    </button>
    <button
      class="action-btn danger"
      onclick={releaseAll}
      disabled={loading || active.length === 0}
    >
      <span class="btn-icon">🧹</span>
      <span class="btn-text">
        <span class="btn-name">Release All</span>
        <span class="btn-hint">forEach release()</span>
      </span>
    </button>
  </div>

  <div class="active-area">
    <span class="output-label">ACTIVE INHIBITORS ({active.length})</span>
    {#if active.length === 0}
      <div class="output-body muted">None — click Keep Awake to acquire one.</div>
    {:else}
      <ul class="active-list">
        {#each active as inhibitor (inhibitor.token)}
          <li class="active-row">
            <div class="active-row-head">
              <code class="token">{inhibitor.token.slice(0, 8)}…</code>
              <span class="created">since {fmtTime(inhibitor.createdAt)}</span>
            </div>
            <div class="active-row-body">
              <span class="pill" class:on={inhibitor.options.system}>system</span>
              <span class="pill" class:on={inhibitor.options.display}>display</span>
              <span class="pill" class:on={inhibitor.options.disk}>disk</span>
              <span class="reason">"{inhibitor.reason}"</span>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <div class="output-area">
    <span class="output-label">OUTPUT</span>
    {#if loading}
      <div class="output-body muted">Working…</div>
    {:else if output}
      <div class="output-body" class:ok={outputOk} class:err={!outputOk}>{output}</div>
    {:else}
      <div class="output-body muted">
        Toggle axes, set a reason, then Keep Awake. Check macOS
        <code>pmset -g assertions</code> or Linux
        <code>systemd-inhibit --list</code> to see real OS state.
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

  .toggle-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }

  .toggle {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 8px 10px;
    background: var(--bg-tertiary);
    border: 1px solid var(--separator);
    border-radius: 7px;
    font-size: 11px;
    cursor: pointer;
    user-select: none;
  }

  .toggle input[type='checkbox'] {
    margin: 0 0 4px 0;
    accent-color: var(--accent-primary);
  }

  .toggle-hint {
    font-size: 9px;
    color: var(--text-secondary);
    opacity: 0.55;
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
    opacity: 0.4;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .pill.on {
    background: color-mix(in srgb, var(--accent-primary) 20%, transparent);
    color: var(--accent-primary);
    opacity: 1;
  }

  .reason {
    color: var(--text-secondary);
    font-style: italic;
    opacity: 0.8;
    margin-left: auto;
    max-width: 60%;
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
