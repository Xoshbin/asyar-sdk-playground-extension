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
    gap: var(--space-5, 12px);
    padding: var(--space-6, 16px);
    color: var(--text-primary, currentColor);
    font-family: var(--font-ui, system-ui, sans-serif);
  }

  header {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .emoji {
    font-size: 32px;
  }
  h1 {
    font-size: var(--font-size-xl, 17px);
    margin: 0;
  }
  .lede {
    color: var(--text-secondary, currentColor);
    margin: 0;
  }

  section h2 {
    font-size: var(--font-size-md, 13px);
    font-weight: 600;
    margin: 0 0 var(--space-2, 6px);
    color: var(--text-secondary, currentColor);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .explainer ol {
    margin: 0;
    padding-left: var(--space-5, 18px);
    display: flex;
    flex-direction: column;
    gap: var(--space-2, 6px);
    color: var(--text-primary, currentColor);
  }
  .explainer code {
    background: var(--bg-secondary, rgba(127, 127, 127, 0.12));
    padding: 1px 4px;
    border-radius: var(--radius-xs, 4px);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.9em;
  }

  .action {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3, 8px);
  }
  .action button {
    background: var(--asyar-brand, #2ec4b6);
    color: white;
    border: none;
    padding: var(--space-3, 8px) var(--space-5, 14px);
    border-radius: var(--radius-md, 8px);
    font-size: var(--font-size-md, 13px);
    font-weight: 600;
    cursor: pointer;
  }
  .action button:disabled {
    opacity: 0.6;
    cursor: progress;
  }
  .action .hint {
    color: var(--text-secondary, currentColor);
    font-size: var(--font-size-sm, 12px);
    margin: 0;
  }
  .action .error {
    color: var(--accent-danger, #ff3b30);
    margin: 0;
    font-size: var(--font-size-sm, 12px);
  }

  .log {
    border-top: 1px solid var(--border-color, rgba(127, 127, 127, 0.2));
    padding-top: var(--space-3, 8px);
  }
  .log__row {
    display: grid;
    grid-template-columns: 80px 1fr;
    gap: var(--space-2, 6px);
    font-size: var(--font-size-sm, 12px);
    padding: 2px 0;
  }
  .log__row time {
    color: var(--text-secondary, currentColor);
    font-family: var(--font-mono, ui-monospace, monospace);
  }
</style>
