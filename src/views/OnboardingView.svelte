<script lang="ts">
  import { onMount } from 'svelte';
  import type { ExtensionContext } from 'asyar-sdk/view';

  interface Props {
    context: ExtensionContext;
  }
  let { context }: Props = $props();

  let completing = $state(false);
  let error = $state<string | null>(null);
  let log = $state<Array<{ at: string; line: string }>>([]);

  function append(line: string) {
    const now = new Date();
    const at = now.toTimeString().slice(0, 8);
    log = [{ at, line }, ...log].slice(0, 8);
  }

  onMount(() => {
    append('Onboarding view mounted — Rust intercepted the original command and routed here.');
  });

  async function complete() {
    completing = true;
    error = null;
    try {
      append('Calling context.proxies.onboarding.complete() …');
      // The launcher marks this extension as onboarded, drains the stashed
      // dispatch (the command the user originally tried to run), and
      // re-dispatches it. The view will switch to whatever that command
      // resolves to (typically `open` → DefaultView for this extension).
      // @ts-expect-error onboarding is added in asyar-sdk 2.4 and may not
      // appear in older type bundles cached by node_modules; the runtime
      // proxy is wired in worker.ts + ExtensionContext.ts.
      await context.proxies.onboarding.complete();
      append('Done. Re-dispatching original command…');
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      append(`Error: ${error}`);
    } finally {
      completing = false;
    }
  }
</script>

<div class="onboarding">
  <header>
    <span class="emoji" aria-hidden="true">👋</span>
    <h1>Welcome to SDK Playground</h1>
    <p class="lede">
      This extension demonstrates per-extension first-use onboarding. The
      launcher intercepted whichever command you ran, stashed it, and routed
      you here.
    </p>
  </header>

  <section class="explainer">
    <h2>What just happened</h2>
    <ol>
      <li>You triggered a command on a Tier 2 extension that declares <code>onboarding.command</code> in its manifest.</li>
      <li>The launcher's Rust dispatch path checked <code>extension_onboarding</code> in <code>asyar_data.db</code>, didn't find a row, so it stashed your original payload and rerouted to this view (<code>setup-onboarding</code>).</li>
      <li>When you click "I'm ready", this view will call <code>context.proxies.onboarding.complete()</code>. The launcher marks this extension as onboarded and re-dispatches the original command.</li>
    </ol>
  </section>

  <section class="action">
    <button type="button" onclick={complete} disabled={completing}>
      {completing ? 'Completing…' : "I'm ready"}
    </button>
    {#if error}
      <p class="error">{error}</p>
    {/if}
    <p class="hint">
      Want to see this flow again? Uninstall + reinstall the extension, or
      run the launcher's <code>reset_extension_onboarding</code> command for
      this extension id.
    </p>
  </section>

  <section class="log" aria-label="Onboarding event log">
    <h2>Event log</h2>
    {#each log as entry (entry.at + entry.line)}
      <div class="log__row">
        <time>{entry.at}</time>
        <span>{entry.line}</span>
      </div>
    {/each}
  </section>
</div>

<style>
  .onboarding {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    padding: var(--space-6);
    color: var(--text-primary);
    font-family: var(--font-ui);
  }

  header {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .emoji {
    font-size: var(--font-size-3xl);
  }
  h1 {
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
    letter-spacing: -0.01em;
  }
  .lede {
    color: var(--text-secondary);
    margin: 0;
  }

  section h2 {
    font-size: var(--font-size-md);
    font-weight: 600;
    margin: 0 0 var(--space-2);
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .explainer ol {
    margin: 0;
    padding-left: var(--space-7);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    color: var(--text-primary);
  }
  .explainer code {
    background: var(--bg-tertiary);
    padding: 1px var(--space-1);
    border-radius: var(--radius-xs);
    font-family: var(--font-mono);
    font-size: 0.9em;
    color: var(--text-primary);
  }

  .action {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
  }
  .action button {
    background: var(--accent-primary);
    color: white;
    border: none;
    padding: var(--space-3) var(--space-5);
    border-radius: var(--radius-sm);
    font-family: var(--font-ui);
    font-size: var(--font-size-md);
    font-weight: 500;
    cursor: pointer;
    transition: opacity var(--transition-fast);
  }
  .action button:hover:not(:disabled) {
    opacity: 0.9;
  }
  .action button:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus);
  }
  .action button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .action .hint {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    margin: 0;
  }
  .action .error {
    color: var(--accent-danger);
    margin: 0;
    font-size: var(--font-size-sm);
  }

  .log {
    border-top: 1px solid var(--separator);
    padding-top: var(--space-3);
  }
  .log__row {
    display: grid;
    grid-template-columns: 80px 1fr;
    gap: var(--space-2);
    font-size: var(--font-size-sm);
    padding: 2px 0;
  }
  .log__row time {
    color: var(--text-tertiary);
    font-family: var(--font-mono);
  }
  .log__row span {
    color: var(--text-secondary);
  }
</style>
