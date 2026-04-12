<script lang="ts">
  import { svc } from '../store';
  import type { FrontmostApplication } from 'asyar-sdk';

  let loading = $state(false);
  let app = $state<FrontmostApplication | null>(null);
  let error = $state('');

  async function getFrontmost() {
    loading = true;
    error = '';
    try {
      app = await svc.application.getFrontmostApplication();
    } catch (e: any) {
      error = e.code ?? e.message ?? String(e);
      app = null;
    } finally {
      loading = false;
    }
  }
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">Application Service</span>
      <span class="section-desc">Retrieve metadata about the currently focused (frontmost) application</span>
    </div>
  </header>

  <div class="btn-group">
    <button class="action-btn" onclick={getFrontmost} disabled={loading}>
      <span class="btn-icon">🎯</span>
      <span class="btn-text">
        <span class="btn-name">Get Focused Application</span>
        <span class="btn-hint">getFrontmostApplication() — Title, Name, ID, Path</span>
      </span>
    </button>
  </div>

  <p class="note">
    <strong>macOS Note:</strong> Window title requires Accessibility permissions. 
    If missing, Asyar will automatically open the System Settings panel on the first call.
  </p>

  <div class="output-area">
    <span class="output-label">OUTPUT</span>
    {#if loading}
      <div class="output-body muted">Fetching metadata…</div>
    {:else if error}
      <div class="output-body err">Error: {error}</div>
    {:else if app}
      <div class="output-body ok">
        <div class="app-info">
          <div class="info-row">
            <span class="info-label">Title:</span>
            <span class="info-value">{app.title || '(empty)'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Name:</span>
            <span class="info-value">{app.name}</span>
          </div>
          <div class="info-row">
            <span class="info-label">ID:</span>
            <span class="info-value"><code>{app.bundleId}</code></span>
          </div>
          <div class="info-row">
            <span class="info-label">Path:</span>
            <span class="info-value"><code>{app.path}</code></span>
          </div>
        </div>
      </div>
    {:else}
      <div class="output-body muted">Press the button above to inspect the frontmost app</div>
    {/if}
  </div>
</div>

<style>
  @import './section.css';

  .app-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .info-row {
    display: flex;
    gap: 8px;
    font-size: 12px;
  }

  .info-label {
    min-width: 50px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .info-value {
    color: var(--text-primary);
    word-break: break-all;
  }

  code {
    background: var(--bg-secondary);
    padding: 1px 4px;
    border-radius: 4px;
    font-family: var(--font-mono);
  }
</style>
