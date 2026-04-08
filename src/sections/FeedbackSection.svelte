<script lang="ts">
  import { svc } from '../store';

  let loading = $state(false);
  let output = $state('');
  let outputOk = $state(true);

  function setOutput(msg: string, ok = true) { output = msg; outputOk = ok; }

  async function testToast() {
    loading = true;
    try {
      const id = await svc.feedback.showToast({ title: 'Saving…', style: 'animated' });
      setOutput(`Toast shown (id: ${id})\nWaiting 1.5 s…`);
      await new Promise(r => setTimeout(r, 1500));
      await svc.feedback.updateToast(id, { title: 'Done!', message: 'Playground synced.', style: 'success' });
      setOutput(`Toast updated → success (id: ${id})`);
    } catch (e: any) { setOutput(`Error: ${e.message ?? e}`, false); }
    finally { loading = false; }
  }

  async function testHUD() {
    loading = true;
    try {
      await svc.feedback.showHUD('🧪 Playground HUD!');
      setOutput('HUD shown');
    } catch (e: any) { setOutput(`Error: ${e.message ?? e}`, false); }
    finally { loading = false; }
  }

  async function testConfirm() {
    loading = true;
    try {
      const ok = await svc.feedback.confirmAlert({
        title: 'Reset output?',
        message: 'This clears the result area.',
        confirmText: 'Reset', cancelText: 'Cancel', variant: 'danger',
      });
      if (ok) { output = ''; } else { setOutput('Cancelled'); }
    } catch (e: any) { setOutput(`Error: ${e.message ?? e}`, false); }
    finally { loading = false; }
  }
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">Feedback Service</span>
      <span class="section-desc">Toast notifications, HUD overlays, confirm dialogs</span>
    </div>
  </header>

  <div class="btn-group">
    <button class="action-btn" onclick={testToast} disabled={loading}>
      <span class="btn-icon">🍞</span>
      <span class="btn-text">
        <span class="btn-name">Show Toast</span>
        <span class="btn-hint">animated → success</span>
      </span>
    </button>
    <button class="action-btn" onclick={testHUD} disabled={loading}>
      <span class="btn-icon">🪟</span>
      <span class="btn-text">
        <span class="btn-name">Show HUD</span>
        <span class="btn-hint">full-screen overlay</span>
      </span>
    </button>
    <button class="action-btn danger" onclick={testConfirm} disabled={loading}>
      <span class="btn-icon">⚠️</span>
      <span class="btn-text">
        <span class="btn-name">Confirm Dialog</span>
        <span class="btn-hint">danger variant</span>
      </span>
    </button>
  </div>

  <div class="output-area">
    <span class="output-label">OUTPUT</span>
    {#if loading}
      <div class="output-body muted">Running…</div>
    {:else if output}
      <div class="output-body" class:ok={outputOk} class:err={!outputOk}>{output}</div>
    {:else}
      <div class="output-body muted">No output yet — press a button above</div>
    {/if}
  </div>
</div>

<style>
  @import './section.css';
</style>
