<script lang="ts">
  import type { ExtensionContext, IOpenerService } from 'asyar-sdk/view';

  interface Props {
    context: ExtensionContext;
  }
  let { context }: Props = $props();

  const opener = $derived(context.getService<IOpenerService>('opener'));

  let loading = $state(false);
  let output = $state('');
  let outputOk = $state(true);

  // URL opener
  let url = $state('https://asyar.org');

  // Path opener
  let targetPath = $state('~');
  let withApp = $state('');

  // Reveal path
  let revealPath = $state('~');

  function setOutput(msg: string, ok = true) {
    output = msg;
    outputOk = ok;
  }

  async function handleOpenUrl() {
    if (!url.trim()) {
      setOutput('Enter a URL first', false);
      return;
    }
    loading = true;
    try {
      await opener.openUrl(url.trim());
      setOutput(`Opened URL: ${url.trim()}`);
    } catch (e: any) {
      setOutput(`Error: ${e.message ?? e}`, false);
    } finally {
      loading = false;
    }
  }

  async function handleOpenPath() {
    if (!targetPath.trim()) {
      setOutput('Enter a path first', false);
      return;
    }
    loading = true;
    try {
      const options = withApp.trim() ? { with: withApp.trim() } : undefined;
      await opener.openPath(targetPath.trim(), options);
      setOutput(
        options?.with
          ? `Opened "${targetPath.trim()}" with "${options.with}"`
          : `Opened "${targetPath.trim()}" with default application`,
      );
    } catch (e: any) {
      setOutput(`Error: ${e.message ?? e}`, false);
    } finally {
      loading = false;
    }
  }

  async function handleReveal() {
    if (!revealPath.trim()) {
      setOutput('Enter a path to reveal first', false);
      return;
    }
    loading = true;
    try {
      await opener.reveal(revealPath.trim());
      setOutput(`Revealed in file manager: ${revealPath.trim()}`);
    } catch (e: any) {
      setOutput(`Error: ${e.message ?? e}`, false);
    } finally {
      loading = false;
    }
  }
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">Opener Service</span>
      <span class="section-desc">
        Open URLs, local paths (files, directories, workspaces), and reveal items in the OS file manager
      </span>
    </div>
  </header>

  <!-- Open URL Card -->
  <div class="card">
    <div class="card-header">
      <span class="card-title">🌐 Open URL</span>
      <span class="card-hint">shell:open-url</span>
    </div>
    <div class="fields">
      <div class="field">
        <span class="field-label">URL</span>
        <input class="field-input" type="text" bind:value={url} placeholder="https://example.com" />
      </div>
    </div>
    <div class="card-actions">
      <button class="action-btn" onclick={handleOpenUrl} disabled={loading}>
        <span class="btn-icon">🔗</span>
        <span class="btn-text">
          <span class="btn-name">Open URL</span>
          <span class="btn-hint">opener.openUrl(url)</span>
        </span>
      </button>
    </div>
  </div>

  <!-- Open Path Card -->
  <div class="card">
    <div class="card-header">
      <span class="card-title">🚀 Open Path & Applications</span>
      <span class="card-hint">shell:open-path</span>
    </div>
    <div class="fields">
      <div class="field">
        <span class="field-label">Target Path (file, directory, or workspace)</span>
        <input
          class="field-input"
          type="text"
          bind:value={targetPath}
          placeholder="~/my-project or /Applications"
        />
      </div>
      <div class="field">
        <span class="field-label">With Application (optional)</span>
        <input
          class="field-input"
          type="text"
          bind:value={withApp}
          placeholder="e.g. Zed, Visual Studio Code, Ghostty, TextEdit"
        />
      </div>
    </div>
    <div class="card-actions">
      <button class="action-btn" onclick={handleOpenPath} disabled={loading}>
        <span class="btn-icon">⚡</span>
        <span class="btn-text">
          <span class="btn-name">Open Path</span>
          <span class="btn-hint">opener.openPath(path, options)</span>
        </span>
      </button>
    </div>
  </div>

  <!-- Reveal Card -->
  <div class="card">
    <div class="card-header">
      <span class="card-title">📂 Reveal in File Manager</span>
      <span class="card-hint">fs:read</span>
    </div>
    <div class="fields">
      <div class="field">
        <span class="field-label">Path to Reveal</span>
        <input
          class="field-input"
          type="text"
          bind:value={revealPath}
          placeholder="/path/to/file or ~"
        />
      </div>
    </div>
    <div class="card-actions">
      <button class="action-btn" onclick={handleReveal} disabled={loading}>
        <span class="btn-icon">👁️</span>
        <span class="btn-text">
          <span class="btn-name">Reveal Item</span>
          <span class="btn-hint">opener.reveal(path)</span>
        </span>
      </button>
    </div>
  </div>

  <!-- Output Console -->
  <div class="output-area">
    <span class="output-label">OUTPUT</span>
    {#if loading}
      <div class="output-body muted">Opening…</div>
    {:else if output}
      <div class="output-body" class:ok={outputOk} class:err={!outputOk}>{output}</div>
    {:else}
      <div class="output-body muted">Choose an opener action above to test IOpenerService</div>
    {/if}
  </div>
</div>

<style>
  @import './section.css';

  .card {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
    border: 1px solid var(--separator);
    border-radius: var(--radius-md);
    background: var(--surface-secondary, rgba(255, 255, 255, 0.03));
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .card-title {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold, 600);
    color: var(--text-primary);
  }

  .card-hint {
    font-size: var(--font-size-xs);
    font-family: var(--font-mono);
    color: var(--text-muted);
  }

  .fields {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .card-actions {
    display: flex;
  }
</style>
