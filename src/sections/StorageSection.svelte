<script lang="ts">
  import { svc } from '../store';

  let loading = $state(false);
  let output = $state('');
  let outputOk = $state(true);
  let key = $state('playground-key');
  let value = $state('');

  function setOutput(msg: string, ok = true) { output = msg; outputOk = ok; }

  async function save() {
    loading = true;
    try {
      await svc.storage.set(key, value);
      setOutput(`Saved: "${key}" = "${value}"`);
    } catch (e: any) { setOutput(`Error: ${e.message ?? e}`, false); }
    finally { loading = false; }
  }

  async function load() {
    loading = true;
    try {
      const result = await svc.storage.get(key);
      setOutput(result !== null && result !== undefined ? `"${key}" = "${result}"` : `"${key}" not found`);
    } catch (e: any) { setOutput(`Error: ${e.message ?? e}`, false); }
    finally { loading = false; }
  }
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">Storage Service</span>
      <span class="section-desc">Persistent key-value storage scoped to this extension</span>
    </div>
  </header>

  <div class="fields">
    <div class="field">
      <span class="field-label">Key</span>
      <input class="field-input" type="text" bind:value={key} placeholder="my-key" />
    </div>
    <div class="field">
      <span class="field-label">Value</span>
      <input class="field-input" type="text" bind:value={value} placeholder="data to store…" />
    </div>
  </div>

  <div class="btn-row">
    <button class="action-btn" onclick={save} disabled={loading}>
      <span class="btn-icon">💾</span>
      <span class="btn-text">
        <span class="btn-name">Save</span>
        <span class="btn-hint">storage.set(key, value)</span>
      </span>
    </button>
    <button class="action-btn" onclick={load} disabled={loading}>
      <span class="btn-icon">📂</span>
      <span class="btn-text">
        <span class="btn-name">Load</span>
        <span class="btn-hint">storage.get(key)</span>
      </span>
    </button>
  </div>

  <div class="output-area">
    <span class="output-label">OUTPUT</span>
    {#if loading}
      <div class="output-body muted">Working…</div>
    {:else if output}
      <div class="output-body" class:ok={outputOk} class:err={!outputOk}>{output}</div>
    {:else}
      <div class="output-body muted">Save a value, then Load to confirm persistence</div>
    {/if}
  </div>
</div>

<style>
  @import './section.css';

  .fields {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .btn-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
</style>
