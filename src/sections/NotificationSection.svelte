<script lang="ts">
  import { svc } from '../store';

  let loading = $state(false);
  let output = $state('');
  let outputOk = $state(true);
  let title = $state('SDK Playground');
  let body = $state('Test notification from the sandbox');

  async function send() {
    loading = true;
    try {
      await svc.notification.notify({ title, body });
      output = 'Notification sent ✓';
      outputOk = true;
    } catch (e: any) {
      output = `Error: ${e.message ?? e}`;
      outputOk = false;
    } finally {
      loading = false;
    }
  }
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">Notification Service</span>
      <span class="section-desc">Send native OS notifications from within the sandbox</span>
    </div>
  </header>

  <div class="fields">
    <div class="field">
      <label class="field-label">Title</label>
      <input class="field-input" type="text" bind:value={title} />
    </div>
    <div class="field">
      <label class="field-label">Body</label>
      <input class="field-input" type="text" bind:value={body} />
    </div>
  </div>

  <div class="btn-group">
    <button class="action-btn" onclick={send} disabled={loading}>
      <span class="btn-icon">🔔</span>
      <span class="btn-text">
        <span class="btn-name">Send Notification</span>
        <span class="btn-hint">notify({ title, body })</span>
      </span>
    </button>
  </div>

  <div class="output-area">
    <span class="output-label">OUTPUT</span>
    {#if loading}
      <div class="output-body muted">Sending…</div>
    {:else if output}
      <div class="output-body" class:ok={outputOk} class:err={!outputOk}>{output}</div>
    {:else}
      <div class="output-body muted">Fill in the fields and press Send</div>
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
</style>
