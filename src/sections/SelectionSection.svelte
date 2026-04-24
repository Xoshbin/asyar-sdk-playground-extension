<script lang="ts">
  import type { ExtensionContext, ISelectionService } from 'asyar-sdk/view';

  interface Props {
    context: ExtensionContext;
  }
  let { context }: Props = $props();

  const selection = $derived(context.getService<ISelectionService>('selection'));

  let loading = $state(false);
  let output = $state('');
  let outputOk = $state(true);

  function setOutput(msg: string, ok = true) { output = msg; outputOk = ok; }

  async function readText() {
    loading = true;
    try {
      const result = await selection.getSelectedText();
      setOutput(result || '(nothing selected)');
    } catch (e: any) { setOutput(`Error: ${e.code ?? e.message ?? e}`, false); }
    finally { loading = false; }
  }

  async function readItems() {
    loading = true;
    try {
      const items = await selection.getSelectedFinderItems();
      setOutput(items.length > 0 ? items.join('\n') : '(no items selected)');
    } catch (e: any) { setOutput(`Error: ${e.code ?? e.message ?? e}`, false); }
    finally { loading = false; }
  }
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">Selection Service</span>
      <span class="section-desc">Read selected text or Finder items from the frontmost app</span>
    </div>
  </header>

  <div class="btn-group">
    <button class="action-btn" onclick={readText} disabled={loading}>
      <span class="btn-icon">📄</span>
      <span class="btn-text">
        <span class="btn-name">Read Selected Text</span>
        <span class="btn-hint">getSelectedText() — AX fast path → clipboard fallback</span>
      </span>
    </button>
    <button class="action-btn" onclick={readItems} disabled={loading}>
      <span class="btn-icon">📁</span>
      <span class="btn-text">
        <span class="btn-name">Read Finder Items</span>
        <span class="btn-hint">getSelectedFinderItems() — returns absolute paths</span>
      </span>
    </button>
  </div>

  <p class="note">Requires Accessibility permission on macOS. Windows uses IUIAutomation. Linux uses Ctrl+C clipboard trick.</p>

  <div class="output-area">
    <span class="output-label">OUTPUT</span>
    {#if loading}
      <div class="output-body muted">Reading…</div>
    {:else if output}
      <div class="output-body" class:ok={outputOk} class:err={!outputOk}>{output}</div>
    {:else}
      <div class="output-body muted">Select text or files in another app, then press a button above</div>
    {/if}
  </div>
</div>

<style>
  @import './section.css';
</style>
