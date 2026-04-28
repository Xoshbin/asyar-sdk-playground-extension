<script lang="ts">
  import type {
    ExtensionContext,
    IDiagnosticsService,
    IClipboardHistoryService,
  } from 'asyar-sdk/view';

  interface Props {
    context: ExtensionContext;
  }
  let { context }: Props = $props();

  const diagnostics = $derived(context.getService<IDiagnosticsService>('diagnostics'));
  const clipboard = $derived(context.getService<IClipboardHistoryService>('clipboard'));

  let loading = $state(false);
  let output = $state('');
  let outputOk = $state(true);

  function setOutput(msg: string, ok = true) {
    output = msg;
    outputOk = ok;
  }

  // ── Severity ladder ────────────────────────────────────────────────

  async function reportInfo() {
    await diagnostics.report({
      kind: 'manual',
      severity: 'info',
      retryable: false,
      context: { message: 'Indexed 423 apps' },
    });
    setOutput('Reported severity=info — bar should auto-clear in ~3s');
  }

  async function reportSuccess() {
    await diagnostics.report({
      kind: 'manual',
      severity: 'success',
      retryable: false,
      context: { message: 'Linked to Notion ✓' },
    });
    setOutput('Reported severity=success — bar should auto-clear in ~3s');
  }

  async function reportWarning() {
    await diagnostics.report({
      kind: 'manual',
      severity: 'warning',
      retryable: false,
      context: { message: 'Slow network detected' },
    });
    setOutput('Reported severity=warning — bar should auto-clear in ~8s');
  }

  async function reportError() {
    await diagnostics.report({
      kind: 'manual',
      severity: 'error',
      retryable: false,
      context: { message: 'Something went wrong' },
    });
    setOutput('Reported severity=error — bar is sticky, press Esc to dismiss');
  }

  async function reportFatal() {
    await diagnostics.report({
      kind: 'manual',
      severity: 'fatal',
      retryable: false,
      context: { message: 'Imaginary fatal condition' },
    });
    setOutput('Reported severity=fatal — FatalErrorDialog should open');
  }

  // ── Iframe-side capture paths (SDK bootstrap listeners) ────────────

  function throwUncaught() {
    setOutput('Throwing uncaught Error in 100ms — should route via iframe_uncaught');
    setTimeout(() => {
      throw new Error('uncaught from sdk-playground');
    }, 100);
  }

  function triggerRejection() {
    setOutput('Rejecting unhandled promise in 100ms — should route via iframe_unhandled_rejection');
    setTimeout(() => {
      Promise.reject(new Error('unhandled from sdk-playground'));
    }, 100);
  }

  // ── Host-side proxy auto-report (permission denied) ────────────────

  async function triggerPermissionDenied() {
    loading = true;
    try {
      // sdk-playground manifest grants clipboard:read but NOT clipboard:write.
      // The proxy call will fail with a permission error; the host's IPC router
      // will auto-report severity=warning, kind=permission_denied to the bar.
      await clipboard.writeToClipboard({ type: 'text', content: 'should be denied' });
      setOutput('Unexpected success — manifest may have been granted clipboard:write', false);
    } catch (e: any) {
      setOutput(`Proxy call rejected (expected): ${e.message ?? e}\nBar should show "Access to clipboard:write was denied"`);
    } finally {
      loading = false;
    }
  }

  // ── Coalescing + sequence demos ────────────────────────────────────

  async function fireCoalesce() {
    setOutput('Firing 5 identical info diagnostics in 50ms intervals — should coalesce');
    for (let i = 0; i < 5; i++) {
      await diagnostics.report({
        kind: 'manual',
        severity: 'info',
        retryable: false,
        context: { message: `Coalesce test #${i + 1}` },
      });
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  async function fireSequence() {
    setOutput('Firing severity sequence: info → success → warning → error');
    const steps: Array<{ severity: 'info' | 'success' | 'warning' | 'error'; message: string; wait: number }> = [
      { severity: 'info', message: '1/4 — info', wait: 1500 },
      { severity: 'success', message: '2/4 — success', wait: 1500 },
      { severity: 'warning', message: '3/4 — warning', wait: 1500 },
      { severity: 'error', message: '4/4 — error (sticky)', wait: 0 },
    ];
    for (const step of steps) {
      await diagnostics.report({
        kind: 'manual',
        severity: step.severity,
        retryable: false,
        context: { message: step.message },
      });
      if (step.wait) await new Promise((r) => setTimeout(r, step.wait));
    }
  }
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">Diagnostics Channel</span>
      <span class="section-desc">Severity ladder, iframe capture paths, proxy auto-report — all surface in the launcher's bottom bar</span>
    </div>
  </header>

  <div class="btn-group">
    <button class="action-btn" onclick={reportInfo} disabled={loading}>
      <span class="btn-icon">ℹ️</span>
      <span class="btn-text">
        <span class="btn-name">Info</span>
        <span class="btn-hint">auto-clear ~3s</span>
      </span>
    </button>

    <button class="action-btn" onclick={reportSuccess} disabled={loading}>
      <span class="btn-icon">✅</span>
      <span class="btn-text">
        <span class="btn-name">Success</span>
        <span class="btn-hint">auto-clear ~3s, green dot</span>
      </span>
    </button>

    <button class="action-btn" onclick={reportWarning} disabled={loading}>
      <span class="btn-icon">⚠️</span>
      <span class="btn-text">
        <span class="btn-name">Warning</span>
        <span class="btn-hint">auto-clear ~8s, amber dot</span>
      </span>
    </button>

    <button class="action-btn danger" onclick={reportError} disabled={loading}>
      <span class="btn-icon">🛑</span>
      <span class="btn-text">
        <span class="btn-name">Error</span>
        <span class="btn-hint">sticky, Esc to dismiss</span>
      </span>
    </button>

    <button class="action-btn danger" onclick={reportFatal} disabled={loading}>
      <span class="btn-icon">💥</span>
      <span class="btn-text">
        <span class="btn-name">Fatal</span>
        <span class="btn-hint">opens FatalErrorDialog</span>
      </span>
    </button>
  </div>

  <div class="btn-group">
    <button class="action-btn" onclick={throwUncaught} disabled={loading}>
      <span class="btn-icon">🧨</span>
      <span class="btn-text">
        <span class="btn-name">Throw uncaught</span>
        <span class="btn-hint">SDK bootstrap → iframe_uncaught</span>
      </span>
    </button>

    <button class="action-btn" onclick={triggerRejection} disabled={loading}>
      <span class="btn-icon">🪤</span>
      <span class="btn-text">
        <span class="btn-name">Unhandled rejection</span>
        <span class="btn-hint">iframe_unhandled_rejection</span>
      </span>
    </button>

    <button class="action-btn" onclick={triggerPermissionDenied} disabled={loading}>
      <span class="btn-icon">🚫</span>
      <span class="btn-text">
        <span class="btn-name">Permission denied</span>
        <span class="btn-hint">clipboard:write → auto-report</span>
      </span>
    </button>
  </div>

  <div class="btn-group">
    <button class="action-btn" onclick={fireCoalesce} disabled={loading}>
      <span class="btn-icon">🔁</span>
      <span class="btn-text">
        <span class="btn-name">Coalesce test</span>
        <span class="btn-hint">5× identical info in 250ms</span>
      </span>
    </button>

    <button class="action-btn" onclick={fireSequence} disabled={loading}>
      <span class="btn-icon">🪜</span>
      <span class="btn-text">
        <span class="btn-name">Severity sequence</span>
        <span class="btn-hint">info → success → warning → error</span>
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
      <div class="output-body muted">No output yet — press a button above and watch the launcher's bottom bar</div>
    {/if}
  </div>
</div>

<style>
  @import './section.css';
</style>
