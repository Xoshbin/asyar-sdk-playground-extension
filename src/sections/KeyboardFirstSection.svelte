<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import {
    ActionCategory,
    ActionContext,
    type ExtensionContext,
    type IActionService,
    type IFeedbackService,
    type ILogService,
  } from 'asyar-sdk/view';

  interface Props {
    context: ExtensionContext;
  }
  let { context }: Props = $props();

  const actions = untrack(() => context.getService<IActionService>('actions'));
  const feedback = untrack(() => context.getService<IFeedbackService>('feedback'));
  const logger = untrack(() => context.getService<ILogService>('log'));

  const LANGUAGE_OPTIONS = [
    { value: 'ckb', label: 'Kurdish (Sorani)' },
    { value: 'kmr', label: 'Kurdish (Kurmanji)' },
    { value: 'en', label: 'English' },
    { value: 'ar', label: 'Arabic' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'es', label: 'Spanish' },
    { value: 'ja', label: 'Japanese' },
    { value: 'ko', label: 'Korean' },
    { value: 'tr', label: 'Turkish' },
    { value: 'pt-BR', label: 'Portuguese (Brazil)' },
    { value: 'zh-CN', label: 'Chinese (Simplified)' },
  ];

  let mode = $state<'form' | 'empty'>('form');
  let title = $state('');
  let language = $state('en');
  let notes = $state('');
  let submissions = $state<Array<{ title: string; language: string; at: string }>>([]);

  const selectedLanguageLabel = $derived(
    LANGUAGE_OPTIONS.find((opt) => opt.value === language)?.label ?? language,
  );

  const isSubmitDisabled = $derived(mode === 'form' && !title.trim());

  async function submitDemoForm() {
    if (mode === 'empty') {
      mode = 'form';
      await feedback.showHUD('Switched to form mode');
      return;
    }
    if (!title.trim()) return;
    const entry = {
      title: title.trim(),
      language: selectedLanguageLabel,
      at: new Date().toLocaleTimeString(),
    };
    submissions = [entry, ...submissions].slice(0, 6);
    logger.info(`[keyboard-first] submitted: ${JSON.stringify(entry)}`);
    await feedback.showHUD(`Saved "${entry.title}" (${entry.language})`);
  }

  function resetDemoForm() {
    title = '';
    language = 'en';
    notes = '';
    void feedback.showHUD('Reset Keyboard-First demo form');
  }

  const PRIMARY_ACTION_ID = 'sdk-playground:keyboard-primary';
  const RESET_ACTION_ID = 'sdk-playground:keyboard-reset';

  $effect(() => {
    const currentMode = mode;
    const disabled = isSubmitDisabled;

    actions.registerAction({
      id: PRIMARY_ACTION_ID,
      title: currentMode === 'empty' ? 'Create Playground Draft' : 'Save Playground Form',
      icon: currentMode === 'empty' ? '➕' : '✅',
      shortcut: currentMode === 'empty' ? 'Enter' : 'Mod+Enter',
      primary: true,
      disabled,
      extensionId: 'org.asyar.sdk-playground',
      category: ActionCategory.PRIMARY,
      context: ActionContext.EXTENSION_VIEW,
      execute: () => submitDemoForm(),
    });
  });

  $effect(() => {
    actions.registerAction({
      id: RESET_ACTION_ID,
      title: 'Reset Keyboard-First Form',
      icon: '🔄',
      shortcut: 'Mod+R',
      extensionId: 'org.asyar.sdk-playground',
      category: ActionCategory.EDIT,
      context: ActionContext.EXTENSION_VIEW,
      execute: () => resetDemoForm(),
    });
  });

  onDestroy(() => {
    actions.unregisterAction(PRIMARY_ACTION_ID);
    actions.unregisterAction(RESET_ACTION_ID);
  });
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">Keyboard-First Controls Demo</span>
      <span class="section-desc">
        Everything here works without touching the mouse — watch the bottom bar change as you type
        or switch modes.
      </span>
    </div>
  </header>

  <div class="mode-pills" role="tablist" aria-label="Demo mode">
    <button
      type="button"
      role="tab"
      aria-selected={mode === 'form'}
      class="mode-pill"
      class:active={mode === 'form'}
      onclick={() => (mode = 'form')}
    >
      Form Mode (⌘ ↵ to save)
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={mode === 'empty'}
      class="mode-pill"
      class:active={mode === 'empty'}
      onclick={(e) => {
        mode = 'empty';
        (e.currentTarget as HTMLButtonElement).blur();
      }}
    >
      Empty State Mode (↵ to create)
    </button>
  </div>

  {#if mode === 'empty'}
    <div class="empty-card">
      <div class="empty-icon">⌨️</div>
      <div class="empty-title">No Drafts Yet</div>
      <div class="empty-desc">
        Look at the bottom-right bar: <strong>Create Playground Draft ↵</strong> is paired with
        this button. Press <kbd>Enter</kbd> to switch back to the form.
      </div>
      <button type="button" class="cta-btn" onclick={() => void submitDemoForm()}>
        Create Playground Draft
      </button>
    </div>
  {:else}
    <div class="form-grid">
      <label class="field">
        <span class="field-label">
          1. Draft Title <span class="hint">(required — unlocks “Save Playground Form ⌘ ↵” at bottom-right)</span>
        </span>
        <input
          class="text-input"
          type="text"
          bind:value={title}
          placeholder="Type any title, then press ⌘↵ to save…"
        />
      </label>

      <label class="field">
        <span class="field-label">
          2. Language <span class="hint">(token-styled HTML control; host searchable picker is in “Required Preferences Demo”)</span>
        </span>
        <select class="text-input" bind:value={language}>
          {#each LANGUAGE_OPTIONS as opt (opt.value)}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </label>

      <label class="field">
        <span class="field-label">
          3. Press Esc While Typing <span class="hint">(focus here and press Esc to go back without using the mouse)</span>
        </span>
        <input
          class="text-input"
          type="text"
          bind:value={notes}
          placeholder="Click/Tab here and press Esc to leave this view…"
        />
      </label>
    </div>

    <div class="info-banner">
      There are no Save or Cancel buttons inside this form. Use <strong>⌘ ↵</strong> to save,
      <strong>⌘ R</strong> to reset, <strong>⌘ K</strong> to see all actions, or
      <strong>Esc</strong> inside any text box to exit.
    </div>
  {/if}

  <div class="output-area">
    <span class="output-label">SUBMISSIONS ({submissions.length})</span>
    {#if submissions.length === 0}
      <div class="output-body muted">
        Current selection: <code>{selectedLanguageLabel}</code> ({language}). Fill Draft Title and
        press <strong>⌘↵</strong>.
      </div>
    {:else}
      <div class="output-body">
        {#each submissions as item (item.at + item.title)}
          <div class="submission-row">
            <span><strong>{item.title}</strong> · {item.language}</span>
            <span class="muted">{item.at}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  @import './section.css';

  .mode-pills {
    display: flex;
    gap: var(--space-2);
  }

  .mode-pill {
    flex: 1;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--separator);
    background: var(--bg-secondary);
    color: var(--text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-xs);
    font-weight: 500;
    cursor: default;
  }

  .mode-pill.active {
    color: var(--accent-primary);
    border-color: var(--accent-primary);
    background: color-mix(in srgb, var(--accent-primary) 10%, transparent);
  }

  .form-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .field-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--text-primary);
  }

  .hint {
    font-weight: 400;
    color: var(--text-secondary);
  }

  .text-input {
    width: 100%;
    box-sizing: border-box;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-family: var(--font-ui);
    font-size: var(--font-size-sm);
    outline: none;
  }

  .text-input:focus {
    border-color: var(--accent-primary);
    box-shadow: var(--shadow-focus);
  }

  .empty-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: var(--space-3);
    padding: var(--space-6);
    border: 1px dashed var(--separator);
    border-radius: var(--radius-md);
    background: var(--bg-secondary);
  }

  .empty-icon {
    font-size: 28px;
    line-height: 1;
  }

  .empty-title {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--text-primary);
  }

  .empty-desc {
    max-width: 380px;
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .cta-btn {
    padding: var(--space-2) var(--space-5);
    border: none;
    border-radius: var(--radius-sm);
    background: var(--accent-primary-fill);
    color: var(--text-on-accent);
    font-family: var(--font-ui);
    font-size: var(--font-size-xs);
    font-weight: 600;
    cursor: default;
  }

  .info-banner {
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--accent-primary) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent-primary) 24%, transparent);
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .submission-row {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-1) 0;
  }
</style>
