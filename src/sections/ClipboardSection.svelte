<script lang="ts">
  import { svc } from '../store';

  let loading = $state(false);
  let output = $state('');
  let outputOk = $state(true);

  function setOutput(msg: string, ok = true) { output = msg; outputOk = ok; }

  async function readClipboard() {
    loading = true;
    try {
      const result = await svc.clipboard.readCurrentClipboard();
      if (!result) { setOutput('(clipboard is empty)'); return; }
      const content = typeof result.content === 'string' && result.content.length > 400
        ? result.content.slice(0, 400) + '…'
        : result.content;
      setOutput(`type:    ${result.type}\ncontent: ${content}`);
    } catch (e: any) { setOutput(`Error: ${e.message ?? e}`, false); }
    finally { loading = false; }
  }
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">Clipboard History Service</span>
      <span class="section-desc">Read the current clipboard content including type metadata</span>
    </div>
  </header>

  <div class="btn-group">
    <button class="action-btn" onclick={readClipboard} disabled={loading}>
      <span class="btn-icon">📋</span>
      <span class="btn-text">
        <span class="btn-name">Read Current Clipboard</span>
        <span class="btn-hint">readCurrentClipboard() — returns type + content</span>
      </span>
    </button>
  </div>

  <div class="output-area">
    <span class="output-label">OUTPUT</span>
    {#if loading}
      <div class="output-body muted">Reading clipboard…</div>
    {:else if output}
      <div class="output-body" class:ok={outputOk} class:err={!outputOk}>{output}</div>
    {:else}
      <div class="output-body muted">Copy something, then press the button above</div>
    {/if}
  </div>
</div>

<style>
  @import './section.css';
</style>
