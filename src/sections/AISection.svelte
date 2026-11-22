<script lang="ts">
  import { onMount } from 'svelte';
  import {
    isValidAiModelRef,
    type AiConfiguredModel,
    type AiModelRef,
    type ExtensionContext,
    type IAiService,
  } from 'asyar-sdk/view';

  interface Props {
    context: ExtensionContext;
  }
  let { context }: Props = $props();

  const ai = $derived(context.getService<IAiService>('ai'));

  const MODE_DEFAULT = '__default__';
  const MODE_PREFERENCE = '__preference__';

  let prompt = $state('Tell me a short fun fact about computers.');
  let output = $state('');
  let running = $state(false);
  let outputOk = $state(true);

  let models = $state<AiConfiguredModel[]>([]);
  let loadingModels = $state(false);
  let modelsError = $state<string | null>(null);
  let selectedTarget = $state<string>(MODE_DEFAULT);
  let preferredModel = $state<AiModelRef | null>(null);

  let abortController: AbortController | null = null;
  let runCancelled = false;

  onMount(() => {
    const syncPref = () => {
      const val = context.preferences.values.preferredAiModel;
      preferredModel = isValidAiModelRef(val) ? val : null;
    };
    syncPref();
    const unsubscribe = context.onPreferencesChanged(syncPref);
    return () => {
      unsubscribe();
      abortController?.abort();
    };
  });

  function encodeRef(ref: AiModelRef): string {
    return JSON.stringify([ref.providerId, ref.modelId]);
  }

  function resolveSelectedModel(): AiModelRef | undefined {
    if (selectedTarget === MODE_DEFAULT) return undefined;
    if (selectedTarget === MODE_PREFERENCE) return preferredModel ?? undefined;
    const found = models.find((m) => encodeRef(m) === selectedTarget);
    return found ? { providerId: found.providerId, modelId: found.modelId } : undefined;
  }

  async function loadModels() {
    if (loadingModels) return;
    loadingModels = true;
    modelsError = null;
    try {
      models = await ai.listModels();
    } catch (err) {
      models = [];
      modelsError = err instanceof Error ? err.message : String(err);
    } finally {
      loadingModels = false;
    }
  }

  async function startStream() {
    if (running || !prompt.trim()) return;
    output = '';
    outputOk = true;
    running = true;
    runCancelled = false;
    abortController = new AbortController();

    try {
      const model = resolveSelectedModel();
      await ai.stream(
        prompt,
        (chunk) => {
          if (!runCancelled) output += chunk;
        },
        model ? { model } : undefined,
      );
    } catch (err) {
      if (!runCancelled) {
        output += (output ? '\n\n' : '') + (err instanceof Error ? err.message : String(err));
        outputOk = false;
      }
    } finally {
      running = false;
      abortController = null;
    }
  }

  async function runComplete() {
    if (running || !prompt.trim()) return;
    output = '';
    outputOk = true;
    running = true;
    runCancelled = false;
    abortController = new AbortController();

    try {
      const model = resolveSelectedModel();
      const res = await ai.complete(prompt, model ? { model } : undefined);
      if (!runCancelled) output = res;
    } catch (err) {
      if (!runCancelled) {
        output = err instanceof Error ? err.message : String(err);
        outputOk = false;
      }
    } finally {
      running = false;
      abortController = null;
    }
  }

  function stop() {
    runCancelled = true;
    abortController?.abort(new Error('Aborted by user'));
    abortController = null;
    running = false;
  }
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">AI Service</span>
      <span class="section-desc">
        Discover configured models via <code>ai.listModels()</code> and prompt with optional per-call model override
      </span>
    </div>
  </header>

  <div class="btn-group">
    <button class="action-btn" onclick={loadModels} disabled={loadingModels}>
      <span class="btn-icon">📋</span>
      <span class="btn-text">
        <span class="btn-name">{loadingModels ? 'Loading models…' : 'List Models'}</span>
        <span class="btn-hint">ai.listModels() ({models.length} loaded)</span>
      </span>
    </button>
  </div>

  {#if modelsError}
    <div class="output-area">
      <span class="output-label">LIST MODELS ERROR</span>
      <div class="output-body err">{modelsError}</div>
    </div>
  {/if}

  <div class="field">
    <span class="field-label">Target Model</span>
    <select class="field-input" bind:value={selectedTarget} disabled={running}>
      <option value={MODE_DEFAULT}>Use Asyar default (no override)</option>
      <option value={MODE_PREFERENCE} disabled={!preferredModel}>
        Use preference ({preferredModel ? `${preferredModel.providerId} / ${preferredModel.modelId}` : 'not set'})
      </option>
      {#each models as m (encodeRef(m))}
        <option value={encodeRef(m)}>
          {m.providerName} — {m.label}{m.isDefault ? ' (default)' : ''}
        </option>
      {/each}
    </select>
  </div>

  <div class="field">
    <span class="field-label">Prompt</span>
    <textarea
      class="field-input prompt-input"
      bind:value={prompt}
      placeholder="Enter a prompt…"
      rows={3}
      disabled={running}
    ></textarea>
  </div>

  <div class="btn-group">
    {#if running}
      <button class="action-btn danger" onclick={stop}>
        <span class="btn-icon">⏹</span>
        <span class="btn-text">
          <span class="btn-name">Stop</span>
          <span class="btn-hint">abortController.abort()</span>
        </span>
      </button>
    {:else}
      <button class="action-btn" onclick={startStream} disabled={!prompt.trim()}>
        <span class="btn-icon">🤖</span>
        <span class="btn-text">
          <span class="btn-name">Start Stream</span>
          <span class="btn-hint">ai.stream(prompt, onChunk, &#123; model &#125;)</span>
        </span>
      </button>
      <button class="action-btn" onclick={runComplete} disabled={!prompt.trim()}>
        <span class="btn-icon">⚡</span>
        <span class="btn-text">
          <span class="btn-name">Complete</span>
          <span class="btn-hint">ai.complete(prompt, &#123; model &#125;)</span>
        </span>
      </button>
    {/if}
  </div>

  <div class="output-area">
    <span class="output-label">OUTPUT{running ? ' — running…' : ''}</span>
    {#if running && !output}
      <div class="output-body muted">Waiting for response…</div>
    {:else if output}
      <div class="output-body" class:ok={outputOk && !running} class:err={!outputOk}>{output}</div>
    {:else}
      <div class="output-body muted">Press Start Stream or Complete to begin</div>
    {/if}
  </div>
</div>

<style>
  @import './section.css';

  .prompt-input {
    resize: vertical;
    min-height: 56px;
    font-family: inherit;
    line-height: 1.5;
  }
</style>
