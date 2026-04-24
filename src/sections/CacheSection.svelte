<script lang="ts">
  import type { ExtensionContext, ICacheService } from 'asyar-sdk/view';

  interface Props {
    context: ExtensionContext;
  }
  let { context }: Props = $props();

  const cache = $derived(context.getService<ICacheService>('cache'));

  let loading = $state(false);
  let output = $state('');
  let outputOk = $state(true);
  let key = $state('cache-test-key');
  let value = $state('some dynamic data');
  let ttlMinutes = $state(1);

  function setOutput(msg: string, ok = true) { output = msg; outputOk = ok; }

  async function save() {
    loading = true;
    try {
      const expirationDate = new Date(Date.now() + ttlMinutes * 60 * 1000);
      await cache.set(key, value, { expirationDate });
      setOutput(`Cached: "${key}" = "${value}"\nExpires at: ${expirationDate.toLocaleTimeString()}`);
    } catch (e: any) { setOutput(`Error: ${e.message ?? e}`, false); }
    finally { loading = false; }
  }

  async function load() {
    loading = true;
    try {
      const result = await cache.get(key);
      if (result === undefined) {
        setOutput(`"${key}" not found or expired`, false);
      } else {
        setOutput(`"${key}" = "${result}"`);
      }
    } catch (e: any) { setOutput(`Error: ${e.message ?? e}`, false); }
    finally { loading = false; }
  }

  async function remove() {
    loading = true;
    try {
      const existed = await cache.remove(key);
      setOutput(existed ? `Removed "${key}"` : `"${key}" did not exist`);
    } catch (e: any) { setOutput(`Error: ${e.message ?? e}`, false); }
    finally { loading = false; }
  }
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">Cache Service</span>
      <span class="section-desc">Isolated persistent storage with TTL support (ideal for API results)</span>
    </div>
  </header>

  <div class="fields">
    <div class="field">
      <span class="field-label">Key</span>
      <input class="field-input" type="text" bind:value={key} placeholder="cache-key" />
    </div>
    <div class="field">
      <span class="field-label">Value</span>
      <input class="field-input" type="text" bind:value={value} placeholder="data to cache…" />
    </div>
    <div class="field">
      <span class="field-label">TTL (Minutes)</span>
      <input class="field-input" type="number" bind:value={ttlMinutes} min="1" max="1440" />
    </div>
  </div>

  <div class="btn-row">
    <button class="action-btn" onclick={save} disabled={loading}>
      <span class="btn-icon">⚡</span>
      <span class="btn-text">
        <span class="btn-name">Set Cache</span>
        <span class="btn-hint">cache.set(key, val, options)</span>
      </span>
    </button>
    <button class="action-btn" onclick={load} disabled={loading}>
      <span class="btn-icon">🔍</span>
      <span class="btn-text">
        <span class="btn-name">Get Cache</span>
        <span class="btn-hint">cache.get(key)</span>
      </span>
    </button>
    <button class="action-btn" onclick={remove} disabled={loading}>
      <span class="btn-icon">🗑️</span>
      <span class="btn-text">
        <span class="btn-name">Remove</span>
        <span class="btn-hint">cache.remove(key)</span>
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
      <div class="output-body muted">Cache a value with a short TTL, then wait to see it expire</div>
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
    grid-template-columns: 1fr 1fr 1fr;
    gap: 6px;
  }
</style>
