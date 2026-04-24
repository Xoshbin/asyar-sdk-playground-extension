<script lang="ts">
  import type {
    AIStreamHandle,
    ExtensionContext,
    IAIService,
  } from 'asyar-sdk/view';

  interface Props {
    context: ExtensionContext;
  }
  let { context }: Props = $props();

  const ai = $derived(context.getService<IAIService>('ai'));

  let prompt = $state('Tell me a short fun fact about computers.');
  let output = $state('');
  let streaming = $state(false);
  let outputOk = $state(true);
  let handle: AIStreamHandle | null = null;

  function start() {
    if (streaming || !prompt.trim()) return;
    output = '';
    outputOk = true;
    streaming = true;

    handle = ai.stream(
      { messages: [{ role: 'user', content: prompt }] },
      {
        onToken(token) { output += token; },
        onDone()       { streaming = false; handle = null; },
        onError(err)   {
          output += (output ? '\n\n' : '') + `[${err.code}] ${err.message}`;
          outputOk = false;
          streaming = false;
          handle = null;
        },
      },
    );
  }

  function stop() {
    handle?.abort();
    handle = null;
    streaming = false;
  }
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">AI Service</span>
      <span class="section-desc">Stream a response from the configured AI provider via ai.stream()</span>
    </div>
  </header>

  <div class="field">
    <span class="field-label">Prompt</span>
    <textarea
      class="field-input prompt-input"
      bind:value={prompt}
      placeholder="Enter a prompt…"
      rows={3}
      disabled={streaming}
    ></textarea>
  </div>

  <div class="btn-group">
    {#if streaming}
      <button class="action-btn danger" onclick={stop}>
        <span class="btn-icon">⏹</span>
        <span class="btn-text">
          <span class="btn-name">Stop Stream</span>
          <span class="btn-hint">handle.abort()</span>
        </span>
      </button>
    {:else}
      <button class="action-btn" onclick={start} disabled={!prompt.trim()}>
        <span class="btn-icon">🤖</span>
        <span class="btn-text">
          <span class="btn-name">Start Stream</span>
          <span class="btn-hint">ai.stream({"{ messages }"})</span>
        </span>
      </button>
    {/if}
  </div>

  <div class="output-area">
    <span class="output-label">OUTPUT{streaming ? ' — streaming…' : ''}</span>
    {#if streaming && !output}
      <div class="output-body muted">Waiting for first token…</div>
    {:else if output}
      <div class="output-body" class:ok={outputOk && !streaming} class:err={!outputOk}>{output}</div>
    {:else}
      <div class="output-body muted">Press Start Stream to begin</div>
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
