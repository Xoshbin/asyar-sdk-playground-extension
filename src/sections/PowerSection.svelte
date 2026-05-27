<script lang="ts">
  import type {
    ActiveInhibitor,
    ExtensionContext,
    IPowerService,
  } from 'asyar-sdk/view';

  interface Props {
    context: ExtensionContext;
  }
  let { context }: Props = $props();

  const power = $derived(context.getService<IPowerService>('power'));

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
      const token = await power.keepAwake({ system, display, disk, reason });
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
      await power.release(token);
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
      await Promise.all(tokens.map((t) => power.release(t)));
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
      active = await power.list();
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
        Prevent OS sleep during long-running work. Tokens survive iframe
        reload — call <b>list()</b> to rediscover.
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
        Toggle axes, set a reason, then Keep Awake.
      </div>
    {/if}
  </div>
</div>

<style>
  @import './section.css';

  .fields {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .toggle-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
  }

  .toggle {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: var(--space-3) var(--space-4);
    background: var(--bg-tertiary);
    border: 1px solid var(--separator);
    border-radius: var(--radius-md);
    font-size: var(--font-size-xs);
    cursor: pointer;
    user-select: none;
  }

  .toggle input[type='checkbox'] {
    margin: 0 0 var(--space-1) 0;
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
    gap: var(--space-2);
  }

  .active-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .active-row {
    padding: var(--space-3) var(--space-4);
    background: var(--bg-secondary);
    border: 1px solid var(--separator);
    border-left: 3px solid var(--accent-primary);
    border-radius: var(--radius-sm);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .active-row-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: var(--font-size-xs);
  }

  .token {
    font-family: var(--font-mono);
    color: var(--text-primary);
    font-weight: 600;
  }

  .created {
    font-size: var(--font-size-2xs);
    color: var(--text-secondary);
    opacity: 0.7;
  }

  .active-row-body {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--font-size-2xs);
  }

  .pill {
    padding: 1px var(--space-2);
    border-radius: var(--radius-lg);
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
    font-family: var(--font-mono);
    font-size: 0.95em;
    background: var(--bg-tertiary);
    padding: 1px var(--space-1);
    border-radius: var(--radius-xs);
  }
</style>
