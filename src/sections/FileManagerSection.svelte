<script lang="ts">
  import { svc } from '../store';

  let loading = $state(false);
  let output = $state('');
  let outputOk = $state(true);
  let path = $state('');

  function setOutput(msg: string, ok = true) { output = msg; outputOk = ok; }

  async function reveal() {
    if (!path.trim()) { setOutput('Enter a path first', false); return; }
    loading = true;
    try {
      await svc.fileManager.showInFileManager(path);
      setOutput(`Revealed: ${path}`);
    } catch (e: any) { setOutput(`Error: ${e.message ?? e}`, false); }
    finally { loading = false; }
  }

  async function trash() {
    if (!path.trim()) { setOutput('Enter a path first', false); return; }
    loading = true;
    try {
      await svc.fileManager.trash(path);
      setOutput(`Trashed: ${path}`);
    } catch (e: any) { setOutput(`Error: ${e.message ?? e}`, false); }
    finally { loading = false; }
  }
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">File Manager Service</span>
      <span class="section-desc">Reveal files in OS file manager or move to trash</span>
    </div>
  </header>

  <div class="fields">
    <div class="field">
      <span class="field-label">Path</span>
      <input class="field-input" type="text" bind:value={path} placeholder="/absolute/path/to/file" />
    </div>
  </div>

  <div class="btn-row">
    <button class="action-btn" onclick={reveal} disabled={loading}>
      <span class="btn-icon">📂</span>
      <span class="btn-text">
        <span class="btn-name">Reveal</span>
        <span class="btn-hint">fileManager.showInFileManager(path)</span>
      </span>
    </button>
    <button class="action-btn" onclick={trash} disabled={loading}>
      <span class="btn-icon">🗑️</span>
      <span class="btn-text">
        <span class="btn-name">Trash</span>
        <span class="btn-hint">fileManager.trash(path)</span>
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
      <div class="output-body muted">Enter an absolute path, then Reveal or Trash</div>
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
