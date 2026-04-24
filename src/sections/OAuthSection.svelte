<script lang="ts">
  import type { ExtensionContext, IOAuthService } from 'asyar-sdk/view';

  interface Props {
    context: ExtensionContext;
  }
  let { context }: Props = $props();

  const oauth = $derived(context.getService<IOAuthService>('oauth'));

  let providerId        = $state('github');
  let clientId          = $state('');
  let authorizationUrl  = $state('https://github.com/login/oauth/authorize');
  let tokenUrl          = $state('https://github.com/login/oauth/access_token');
  let scopesInput       = $state('repo');

  let loading   = $state(false);
  let output    = $state('');
  let outputOk  = $state(true);
  let statusMsg = $state('');

  async function authorize() {
    if (loading || !clientId.trim()) return;
    loading = true;
    output = '';
    outputOk = true;
    statusMsg = 'Opening browser — waiting for authorization…';

    try {
      const scopes = scopesInput.split(',').map(s => s.trim()).filter(Boolean);
      const token = await oauth.authorize({
        providerId:       providerId.trim(),
        clientId:         clientId.trim(),
        authorizationUrl: authorizationUrl.trim(),
        tokenUrl:         tokenUrl.trim(),
        scopes,
      });
      statusMsg = '';
      output = JSON.stringify(token, null, 2);
      outputOk = true;
    } catch (err: any) {
      statusMsg = '';
      output = err?.message ?? String(err);
      outputOk = false;
    } finally {
      loading = false;
    }
  }

  async function revoke() {
    if (loading || !providerId.trim()) return;
    loading = true;
    output = '';
    outputOk = true;
    statusMsg = '';

    try {
      await oauth.revokeToken(providerId.trim());
      output = `Token for provider "${providerId}" revoked.`;
      outputOk = true;
    } catch (err: any) {
      output = err?.message ?? String(err);
      outputOk = false;
    } finally {
      loading = false;
    }
  }

  const canAuthorize = $derived(!!clientId.trim() && !loading);
  const canRevoke    = $derived(!!providerId.trim() && !loading);
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">OAuth Service</span>
      <span class="section-desc">
        PKCE authorization flow via oauth.authorize() / oauth.revokeToken() — requires oauth:use permission
      </span>
    </div>
  </header>

  <div class="field">
    <span class="field-label">Provider ID</span>
    <input class="field-input" bind:value={providerId} placeholder="e.g. github" disabled={loading} />
  </div>

  <div class="field">
    <span class="field-label">Client ID <span class="required">*</span></span>
    <input
      class="field-input"
      bind:value={clientId}
      placeholder="Your OAuth app client ID"
      disabled={loading}
    />
  </div>

  <div class="field">
    <span class="field-label">Authorization URL</span>
    <input class="field-input" bind:value={authorizationUrl} disabled={loading} />
  </div>

  <div class="field">
    <span class="field-label">Token URL</span>
    <input class="field-input" bind:value={tokenUrl} disabled={loading} />
  </div>

  <div class="field">
    <span class="field-label">Scopes (comma-separated)</span>
    <input class="field-input" bind:value={scopesInput} placeholder="repo, read:user" disabled={loading} />
  </div>

  <div class="btn-group">
    <button class="action-btn" onclick={authorize} disabled={!canAuthorize}>
      <span class="btn-icon">{loading && statusMsg ? '⏳' : '🔑'}</span>
      <span class="btn-text">
        <span class="btn-name">Authorize</span>
        <span class="btn-hint">oauth.authorize({"{ providerId, clientId, … }"})</span>
      </span>
    </button>

    <button class="action-btn danger" onclick={revoke} disabled={!canRevoke}>
      <span class="btn-icon">🗑</span>
      <span class="btn-text">
        <span class="btn-name">Revoke Token</span>
        <span class="btn-hint">oauth.revokeToken(providerId)</span>
      </span>
    </button>
  </div>

  <div class="output-area">
    <span class="output-label">OUTPUT</span>
    {#if statusMsg}
      <div class="output-body muted">{statusMsg}</div>
    {:else if output}
      <div class="output-body" class:ok={outputOk} class:err={!outputOk}>{output}</div>
    {:else}
      <div class="output-body muted">Enter a Client ID and press Authorize</div>
    {/if}
  </div>
</div>

<style>
  @import './section.css';

  .required {
    color: #ef4444;
    margin-left: 2px;
  }
</style>
