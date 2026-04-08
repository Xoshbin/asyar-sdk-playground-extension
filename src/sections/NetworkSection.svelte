<script lang="ts">
  import { svc } from '../store';

  let loading = $state(false);
  let output = $state('');
  let outputOk = $state(true);
  let url = $state('https://httpbin.org/get');

  function setOutput(msg: string, ok = true) { output = msg; outputOk = ok; }

  async function fetchGet() {
    loading = true;
    try {
      const res = await svc.network.fetch(url, { method: 'GET' });
      const body = typeof res.body === 'string' && res.body.length > 400
        ? res.body.slice(0, 400) + '…'
        : res.body;
      setOutput(`status: ${res.status} ${res.ok ? '✓' : '✗'}\n\n${body}`, res.ok);
    } catch (e: any) { setOutput(`Error: ${e.message ?? e}`, false); }
    finally { loading = false; }
  }
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">Network Service</span>
      <span class="section-desc">Make authorized HTTP requests from within the sandbox</span>
    </div>
  </header>

  <div class="field">
    <span class="field-label">URL</span>
    <input class="field-input" type="text" bind:value={url} placeholder="https://…" />
  </div>

  <div class="btn-group">
    <button class="action-btn" onclick={fetchGet} disabled={loading}>
      <span class="btn-icon">🌐</span>
      <span class="btn-text">
        <span class="btn-name">Fetch GET</span>
        <span class="btn-hint">network.fetch(url, {"{ method: 'GET' }"})</span>
      </span>
    </button>
  </div>

  <div class="output-area">
    <span class="output-label">OUTPUT</span>
    {#if loading}
      <div class="output-body muted">Fetching…</div>
    {:else if output}
      <div class="output-body" class:ok={outputOk} class:err={!outputOk}>{output}</div>
    {:else}
      <div class="output-body muted">Enter a URL and press Fetch GET</div>
    {/if}
  </div>
</div>

<style>
  @import './section.css';
</style>
