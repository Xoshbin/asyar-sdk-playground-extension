<script lang="ts">
  import { onMount, onDestroy, untrack } from 'svelte';
  import {
    ActionCategory,
    ActionContext,
    type ExtensionContext,
    type IActionService,
    type IExtensionManager,
    type IFeedbackService,
    type IPreferencesService,
  } from 'asyar-sdk/view';

  interface Props {
    context: ExtensionContext;
  }
  let { context }: Props = $props();

  const actions = untrack(() => context.getService<IActionService>('actions'));
  const extensions = untrack(() => context.getService<IExtensionManager>('extensions'));
  const feedback = untrack(() => context.getService<IFeedbackService>('feedback'));
  const preferences = untrack(() => context.getService<IPreferencesService>('preferences'));

  let targetRegion = $state<string>('');
  let workspaceName = $state<string>('');
  let loading = $state(true);

  const RESET_ACTION_ID = 'sdk-playground:reset-required-prefs';

  async function loadCommandPrefs() {
    loading = true;
    try {
      const all = await preferences.getAll();
      const cmd = all.commands['required-prefs-demo'] ?? {};
      targetRegion = String(cmd.targetRegion ?? '');
      workspaceName = String(cmd.workspaceName ?? '');
    } finally {
      loading = false;
    }
  }

  async function resetAndRetest() {
    await preferences.reset('required-prefs-demo');
    await feedback.showHUD('Cleared required prefs — re-run Required Preferences Demo to test setup');
    await extensions.navigateBack();
  }

  onMount(() => {
    void loadCommandPrefs();
    const unsub = context.onPreferencesChanged(() => {
      void loadCommandPrefs();
    });

    actions.registerAction({
      id: RESET_ACTION_ID,
      title: 'Reset & Re-test Required Setup',
      icon: '🔄',
      shortcut: 'Enter',
      primary: true,
      extensionId: 'org.asyar.sdk-playground',
      category: ActionCategory.PRIMARY,
      context: ActionContext.EXTENSION_VIEW,
      execute: () => resetAndRetest(),
    });

    return () => {
      unsub();
    };
  });

  onDestroy(() => {
    actions.unregisterAction(RESET_ACTION_ID);
  });
</script>

<div class="required-demo">
  <div class="card">
    <div class="badge">Required Preferences Complete</div>
    <h1>{workspaceName || 'Configured Workspace'}</h1>
    <p class="subtitle">
      You completed the in-shell Required Preferences screen (extension hero, searchable
      <code>Target Region</code> dropdown, and <code>Continue ⌘ ↵</code>).
    </p>

    {#if loading}
      <p class="muted">Loading resolved command preferences…</p>
    {:else}
      <div class="rows">
        <div class="row">
          <span class="label">Target Region</span>
          <span class="value">{targetRegion || '—'}</span>
        </div>
        <div class="row">
          <span class="label">Workspace Name</span>
          <span class="value">{workspaceName || '—'}</span>
        </div>
      </div>
    {/if}

    <p class="hint">
      Press <kbd>Enter</kbd> (<strong>Reset &amp; Re-test Required Setup ↵</strong> in the bottom bar)
      to clear these saved command preferences and pop back so you can trigger the setup screen
      again immediately.
    </p>
  </div>
</div>

<style>
  .required-demo {
    height: 100%;
    padding: var(--space-8);
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    color: var(--text-primary);
    font-family: var(--font-ui);
    box-sizing: border-box;
  }

  .card {
    width: 100%;
    max-width: 460px;
    padding: var(--space-6);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .badge {
    align-self: flex-start;
    padding: 2px var(--space-3);
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--accent-success) 15%, transparent);
    color: var(--accent-success);
    font-size: var(--font-size-2xs);
    font-weight: 600;
  }

  h1 {
    margin: 0;
    font-size: var(--font-size-xl);
    font-weight: 700;
    color: var(--text-primary);
  }

  .subtitle,
  .hint,
  .muted {
    margin: 0;
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .rows {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-sm);
    background: var(--bg-primary);
    border: 1px solid var(--separator);
    font-size: var(--font-size-sm);
  }

  .label {
    color: var(--text-secondary);
  }

  .value {
    font-weight: 600;
    color: var(--text-primary);
  }
</style>
