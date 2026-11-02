<script lang="ts">
  import type { ExtensionContext, IShortcutsService, ShortcutInfo } from 'asyar-sdk/view';

  interface Props {
    context: ExtensionContext;
  }
  let { context }: Props = $props();

  const shortcuts = $derived(context.getService<IShortcutsService>('shortcuts'));

  let loading = $state(false);
  let output = $state('');
  let outputOk = $state(true);
  let list = $state<ShortcutInfo[]>([]);
  let filter = $state('');
  let target = $state('');
  let input = $state('');

  const visible = $derived(
    list.filter((s) => s.name.toLowerCase().includes(filter.trim().toLowerCase())),
  );

  function setOutput(msg: string, ok = true) {
    output = msg;
    outputOk = ok;
  }

  async function run(label: string, fn: () => Promise<void>) {
    loading = true;
    try {
      await fn();
    } catch (e: any) {
      setOutput(`${label} error: ${e?.message ?? e}`, false);
    } finally {
      loading = false;
    }
  }

  const listShortcuts = () =>
    run('list', async () => {
      list = await shortcuts.list();
      setOutput(`✓ ${list.length} shortcut(s)`);
    });

  const runShortcut = () =>
    run('run', async () => {
      const started = Date.now();
      const result = await shortcuts.run(target.trim(), input || undefined);
      const secs = ((Date.now() - started) / 1000).toFixed(1);
      setOutput(`✓ Finished in ${secs}s\n${result ? `Output: ${result}` : '(no output)'}`);
    });
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">Shortcuts Service</span>
      <span class="section-desc">
        List and run Apple Shortcuts (macOS). Runs the system shortcuts tool directly: no
        shell:spawn, no consent dialog, no Runs entry.
      </span>
    </div>
  </header>

  <div class="btn-row">
    <button class="action-btn" onclick={listShortcuts} disabled={loading}>
      <span class="btn-icon">📋</span>
      <span class="btn-text">
        <span class="btn-name">List Shortcuts</span>
        <span class="btn-hint">shortcuts.list()</span>
      </span>
    </button>
  </div>

  <div class="field">
    <span class="field-label">Filter</span>
    <input class="field-input" placeholder="Filter by name" bind:value={filter} />
  </div>

  <div class="output-area">
    <span class="output-label">SHORTCUTS ({visible.length}/{list.length}) — click to select</span>
    {#each visible as s (s.id)}
      <button class="output-body" onclick={() => (target = s.id)}>
        <b>{s.name}</b> · {s.id}
      </button>
    {:else}
      <div class="output-body muted">Click List Shortcuts.</div>
    {/each}
  </div>

  <div class="field">
    <span class="field-label">Id or name</span>
    <input class="field-input" placeholder="UUID or shortcut name" bind:value={target} />
  </div>
  <div class="field">
    <span class="field-label">Input (optional)</span>
    <textarea class="field-input" rows="2" bind:value={input}></textarea>
  </div>

  <div class="btn-row">
    <button class="action-btn" onclick={runShortcut} disabled={loading || !target.trim()}>
      <span class="btn-icon">▶️</span>
      <span class="btn-text">
        <span class="btn-name">Run Shortcut</span>
        <span class="btn-hint">shortcuts.run(idOrName, input?)</span>
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
      <div class="output-body muted">List, pick a shortcut, then run it.</div>
    {/if}
  </div>
</div>

<style>
  @import './section.css';
</style>
