<script lang="ts">
  import { svc } from '../store';

  let loading = $state(false);
  let output = $state('');
  let outputOk = $state(true);
  let extensionId = $state('org.asyar.clipboard');
  let commandId = $state('show-clipboard');
  let args = $state('');

  function setOutput(msg: string, ok = true) { output = msg; outputOk = ok; }

  async function launch() {
    loading = true;
    try {
      const parsedArgs = args.trim() ? JSON.parse(args) : undefined;
      await svc.interop.launchCommand(extensionId, commandId, parsedArgs);
      setOutput(`Launched: ${extensionId} / ${commandId}`);
    } catch (e: any) { setOutput(`Error: ${e.message ?? e}`, false); }
    finally { loading = false; }
  }

  async function launchNotFound() {
    loading = true;
    try {
      await svc.interop.launchCommand('com.nonexistent.extension', 'run');
      setOutput('Unexpected success — should have thrown');
    } catch (e: any) { setOutput(`Error (expected): ${e.message ?? e}`, false); }
    finally { loading = false; }
  }
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">Interop Service</span>
      <span class="section-desc">Invoke commands in other installed extensions</span>
    </div>
  </header>

  <div class="fields">
    <div class="field">
      <span class="field-label">Extension ID</span>
      <input class="field-input" type="text" bind:value={extensionId} placeholder="com.example.ext" />
    </div>
    <div class="field">
      <span class="field-label">Command ID</span>
      <input class="field-input" type="text" bind:value={commandId} placeholder="run" />
    </div>
    <div class="field">
      <span class="field-label">Args (JSON, optional)</span>
      <input class="field-input" type="text" bind:value={args} placeholder={'{"query": "hello"}'} />
    </div>
  </div>

  <div class="btn-row">
    <button class="action-btn" onclick={launch} disabled={loading}>
      <span class="btn-icon">🚀</span>
      <span class="btn-text">
        <span class="btn-name">Launch</span>
        <span class="btn-hint">interop.launchCommand(ext, cmd, args)</span>
      </span>
    </button>
    <button class="action-btn" onclick={launchNotFound} disabled={loading}>
      <span class="btn-icon">❌</span>
      <span class="btn-text">
        <span class="btn-name">Not Found</span>
        <span class="btn-hint">Trigger EXTENSION_NOT_FOUND error</span>
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
      <div class="output-body muted">Enter an extension ID and command, then Launch</div>
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
