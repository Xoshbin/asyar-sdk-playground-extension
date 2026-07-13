<script lang="ts">
  import { onMount } from 'svelte';
  import type {
    ExtensionContext,
    ExtensionStateProxy,
    FeedbackProgressHandle,
    IFeedbackService,
  } from 'asyar-sdk/view';
  import {
    FEEDBACK_SCENARIO_GROUPS,
    SDK_PLAYGROUND_RELEASE_URL,
    SDK_PLAYGROUND_RELEASE_VERSION,
    feedbackAnnouncementIdForVersion,
    type FeedbackScenarioId,
  } from '../lib/feedbackScenarios';
  import { STATE_KEYS, type NotifActionLogEntry } from '../stateKeys';
  import { formatTime } from '../lib/timeFormat';

  interface Props {
    context: ExtensionContext;
  }

  let { context }: Props = $props();

  const feedback = $derived(context.getService<IFeedbackService>('feedback'));
  const stateProxy = $derived(context.getService<ExtensionStateProxy>('state'));

  let runningScenario = $state<FeedbackScenarioId | null>(null);
  let output = $state('');
  let outputOk = $state(true);
  let activeProgress: FeedbackProgressHandle | null = null;
  let lastBackgroundId = '';
  let actionLog = $state<NotifActionLogEntry[]>([]);

  onMount(() => {
    let active = true;
    let unsubscribe: (() => void | Promise<void>) | null = null;

    void Promise.all([
      stateProxy.get(STATE_KEYS.logsNotifActions),
      stateProxy.subscribe(STATE_KEYS.logsNotifActions, (value) => {
        if (active) actionLog = Array.isArray(value) ? (value as NotifActionLogEntry[]) : [];
      }),
    ]).then(([initial, stop]) => {
      if (!active) {
        void stop();
        return;
      }
      actionLog = Array.isArray(initial) ? (initial as NotifActionLogEntry[]) : [];
      unsubscribe = stop;
    });

    return () => {
      active = false;
      void unsubscribe?.();
    };
  });

  const sleep = (durationMs: number) =>
    new Promise<void>((resolve) => window.setTimeout(resolve, durationMs));

  function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  function setOutput(message: string, ok = true): void {
    output = message;
    outputOk = ok;
  }

  async function report(
    severity: 'info' | 'success' | 'warning' | 'error' | 'fatal',
    message: string,
    developerDetail?: string,
  ): Promise<void> {
    await feedback.report({
      kind: `playground_${severity}`,
      severity,
      retryable: severity === 'error',
      context: { message },
      developerDetail,
    });
  }

  async function runScenario(id: FeedbackScenarioId): Promise<void> {
    runningScenario = id;
    try {
      switch (id) {
        case 'bar-info':
          await report('info', 'SDK Playground sent informational feedback.');
          break;
        case 'bar-success':
          await report('success', 'SDK Playground operation completed successfully.');
          break;
        case 'bar-warning':
          await report('warning', 'SDK Playground found something that needs attention.');
          break;
        case 'bar-error':
          await report('error', 'SDK Playground simulated a recoverable failure.');
          break;
        case 'bar-error-details':
          await report(
            'error',
            'The simulated request failed. Open Details to inspect the technical context.',
            'HTTP 503 Service Unavailable\nrequestId=playground-503\nretryAfter=30s',
          );
          break;
        case 'bar-long-message':
          await report(
            'warning',
            'This deliberately long feedback message verifies that overflowing text scrolls slowly across the fixed-height Feedback Bar, pauses at both ends, pauses while hovered or focused, and remains readable without expanding the launcher layout.',
          );
          break;
        case 'bar-deduplication':
          await Promise.all([
            report('info', 'Identical feedback should be coalesced.'),
            report('info', 'Identical feedback should be coalesced.'),
            report('info', 'Identical feedback should be coalesced.'),
          ]);
          break;
        case 'bar-priority':
          await Promise.all([
            report('info', 'Priority test: information.'),
            report('warning', 'Priority test: warning.'),
            report('error', 'Priority test: error should take precedence.'),
          ]);
          break;
        case 'progress-indeterminate':
          activeProgress = await feedback.showProgress({ title: 'Waiting for an unknown result…' });
          break;
        case 'progress-determinate-success': {
          activeProgress = await feedback.showProgress({
            title: 'Downloading test payload',
            completed: 0,
            total: 3,
          });
          for (let completed = 1; completed <= 3; completed += 1) {
            await sleep(500);
            await activeProgress.update({
              title: completed === 3 ? 'Verifying test payload' : 'Downloading test payload',
              completed,
              total: 3,
            });
          }
          await activeProgress.succeed('Test payload installed');
          activeProgress = null;
          break;
        }
        case 'progress-failure':
          activeProgress = await feedback.showProgress({ title: 'Connecting to test server…' });
          await sleep(700);
          await activeProgress.fail('Test connection failed', 'ECONNREFUSED 127.0.0.1:443');
          activeProgress = null;
          break;
        case 'progress-dismiss':
          if (!activeProgress) {
            setOutput('Start indeterminate progress first.', false);
            return;
          }
          await activeProgress.dismiss();
          activeProgress = null;
          break;
        case 'announcement':
          await feedback.announce({
            id: feedbackAnnouncementIdForVersion(SDK_PLAYGROUND_RELEASE_VERSION, 'clickable-v1'),
            title: `Updated to v${SDK_PLAYGROUND_RELEASE_VERSION}`,
            message: 'Click to see what changed',
            action: { type: 'open-url', url: SDK_PLAYGROUND_RELEASE_URL },
          });
          break;
        case 'hud-after-close':
          await feedback.showHUD('SDK Playground action completed');
          break;
        case 'confirmation-default': {
          const confirmed = await feedback.confirmAlert({
            title: 'Continue test?',
            message: 'This exercises the default confirmation presentation.',
            confirmText: 'Continue',
          });
          setOutput(
            confirmed ? 'Default confirmation accepted.' : 'Default confirmation cancelled.',
          );
          return;
        }
        case 'confirmation-danger': {
          const confirmed = await feedback.confirmAlert({
            title: 'Delete simulated data?',
            message: 'No real data is deleted. This exercises the danger presentation.',
            confirmText: 'Delete',
            variant: 'danger',
          });
          setOutput(confirmed ? 'Danger confirmation accepted.' : 'Danger confirmation cancelled.');
          return;
        }
        case 'confirmation-concurrent': {
          const first = feedback.confirmAlert({
            title: 'First confirmation',
            message: 'Keep this open briefly; the second request is sent immediately.',
          });
          const second = await feedback.confirmAlert({
            title: 'Second confirmation',
            message: 'The host should reject this request while the first is open.',
          });
          const firstResult = await first;
          setOutput(`First result: ${firstResult}. Second result: ${second} (expected false).`);
          return;
        }
        case 'background-plain':
          lastBackgroundId = await feedback.sendBackground({
            title: 'SDK Playground background result',
            body: 'This arrived through feedback.sendBackground().',
          });
          break;
        case 'background-actions':
          lastBackgroundId = await feedback.sendBackground({
            title: 'Coffee ending in 1 minute',
            body: 'Choose an action to exercise background command dispatch.',
            actions: [
              {
                id: 'extend',
                title: 'Extend 30m',
                commandId: 'notif-extend',
                args: { minutes: 30 },
              },
              { id: 'stop', title: 'Stop now', commandId: 'notif-stop' },
            ],
          });
          break;
        case 'background-dismiss':
          if (!lastBackgroundId) {
            setOutput('Send background feedback first.', false);
            return;
          }
          await feedback.dismissBackground(lastBackgroundId);
          lastBackgroundId = '';
          break;
        case 'fatal':
          await report(
            'fatal',
            'SDK Playground simulated an unrecoverable extension failure.',
            'Fatal scenario requested manually from the SDK Playground feedback harness.',
          );
          break;
      }

      setOutput(`Completed: ${id}`);
    } catch (error) {
      setOutput(`Error: ${errorMessage(error)}`, false);
    } finally {
      runningScenario = null;
    }
  }
</script>

<div class="section custom-scrollbar">
  <header class="section-header">
    <div>
      <span class="section-title">Feedback Service</span>
      <span class="section-desc">
        Every scenario crosses the real Tier 2 IPC boundary. The launcher chooses the presenter.
      </span>
    </div>
  </header>

  <p class="note">
    Fatal feedback opens the fatal dialog. HUD feedback closes the launcher. Stable announcements
    may be suppressed after their first successful display.
  </p>

  {#each FEEDBACK_SCENARIO_GROUPS as group}
    <section class="scenario-group">
      <div class="scenario-heading">
        <span class="scenario-title">{group.title}</span>
        <span class="scenario-description">{group.description}</span>
      </div>

      <div class="btn-group">
        {#each group.scenarios as scenario}
          <button
            class="action-btn"
            class:danger={scenario.danger}
            onclick={() => runScenario(scenario.id)}
            disabled={runningScenario !== null}
          >
            <span class="btn-icon">{scenario.icon}</span>
            <span class="btn-text">
              <span class="btn-name">{scenario.title}</span>
              <span class="btn-hint">{scenario.hint}</span>
            </span>
            {#if runningScenario === scenario.id}
              <span class="running-indicator">Running…</span>
            {/if}
          </button>
        {/each}
      </div>
    </section>
  {/each}

  <div class="output-area">
    <span class="output-label">LAST RESULT</span>
    {#if output}
      <div class="output-body" class:ok={outputOk} class:err={!outputOk}>{output}</div>
    {:else}
      <div class="output-body muted">Choose a scenario above.</div>
    {/if}
  </div>

  <section class="action-log">
    <span class="output-label">BACKGROUND ACTION LOG</span>
    {#if actionLog.length === 0}
      <div class="output-body muted">
        Run “Background actions”, then click an OS notification action.
      </div>
    {:else}
      <ul class="action-log-list">
        {#each [...actionLog].reverse() as entry}
          <li class="action-log-item">
            <span>{formatTime(entry.at)}</span>
            <span>{entry.note}</span>
            <code>{entry.commandId}</code>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<style>
  @import './section.css';

  .scenario-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .scenario-heading {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .scenario-title {
    color: var(--text-primary);
    font-size: var(--font-size-xs);
    font-weight: 600;
  }

  .scenario-description {
    color: var(--text-tertiary);
    font-size: var(--font-size-2xs);
  }

  .running-indicator {
    margin-left: auto;
    color: var(--accent-primary);
    font-size: var(--font-size-2xs);
  }

  .output-area {
    margin-top: var(--space-3);
  }

  .action-log {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .action-log-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .action-log-item {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: var(--space-3);
    padding: var(--space-3);
    border: 1px solid var(--separator);
    border-radius: var(--radius-md);
    background: var(--bg-secondary);
    color: var(--text-secondary);
    font-size: var(--font-size-2xs);
  }

  .action-log-item code {
    color: var(--text-primary);
    font-family: var(--font-mono);
  }
</style>
