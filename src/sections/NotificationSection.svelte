<script lang="ts">
  import { onMount } from 'svelte';
  import type {
    ExtensionContext,
    ExtensionStateProxy,
    INotificationService,
  } from 'asyar-sdk/view';
  import { STATE_KEYS, type NotifActionLogEntry } from '../stateKeys';
  import { formatTime } from '../lib/timeFormat';

  interface Props {
    context: ExtensionContext;
  }
  let { context }: Props = $props();

  const notification = $derived(context.getService<INotificationService>('notifications'));
  const stateProxy = $derived(context.getService<ExtensionStateProxy>('state'));

  let loading = $state(false);
  let output = $state('');
  let outputOk = $state(true);
  let title = $state('Coffee ending in 1 minute');
  let body = $state('Extend or stop before the timer runs out.');

  let log = $state<NotifActionLogEntry[]>([]);
  // lastSentId stays view-local — it is only useful while the view is mounted
  // to drive the "Dismiss last" button; no value to persisting it.
  let lastSentId = $state('');

  onMount(() => {
    let active = true;
    const cleanup: Array<() => void | Promise<void>> = [];

    (async () => {
      const [initial, unsub] = await Promise.all([
        stateProxy.get(STATE_KEYS.logsNotifActions),
        stateProxy.subscribe(STATE_KEYS.logsNotifActions, (v) => {
          if (!active) return;
          log = Array.isArray(v) ? (v as NotifActionLogEntry[]) : [];
        }),
      ]);
      if (!active) {
        void unsub();
        return;
      }
      log = Array.isArray(initial) ? (initial as NotifActionLogEntry[]) : [];
      cleanup.push(unsub);
    })();

    return () => {
      active = false;
      for (const fn of cleanup) {
        try {
          void fn();
        } catch {
          // Best-effort teardown
        }
      }
    };
  });

  async function sendPlain() {
    loading = true;
    try {
      const id = await notification.send({ title, body });
      lastSentId = id;
      output = `Sent (${id}) — no action buttons.`;
      outputOk = true;
    } catch (e: any) {
      output = `Error: ${e.message ?? e}`;
      outputOk = false;
    } finally {
      loading = false;
    }
  }

  async function sendWithActions() {
    loading = true;
    try {
      const id = await notification.send({
        title,
        body,
        actions: [
          { id: 'extend', title: 'Extend 30m', commandId: 'notif-extend', args: { minutes: 30 } },
          { id: 'stop',   title: 'Stop now',   commandId: 'notif-stop' },
        ],
      });
      lastSentId = id;
      output = `Sent (${id}) — click Extend or Stop on the OS notification.`;
      outputOk = true;
    } catch (e: any) {
      output = `Error: ${e.message ?? e}`;
      outputOk = false;
    } finally {
      loading = false;
    }
  }

  async function dismissLast() {
    if (!lastSentId) return;
    try {
      await notification.dismiss(lastSentId);
      output = `Dismissed ${lastSentId}`;
      outputOk = true;
    } catch (e: any) {
      output = `Dismiss error: ${e.message ?? e}`;
      outputOk = false;
    }
  }

  async function clearLog() {
    await context.request('clearLog', { logKey: STATE_KEYS.logsNotifActions });
  }
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">Notification Service</span>
      <span class="section-desc">
        Send OS notifications — with or without action buttons that fire extension
        commandIds. Action commandIds are dispatched into the <b>worker</b>
        iframe so they survive view Dormant.
      </span>
    </div>
  </header>

  <div class="fields">
    <div class="field">
      <label class="field-label" for="notif-title">Title</label>
      <input id="notif-title" class="field-input" type="text" bind:value={title} />
    </div>
    <div class="field">
      <label class="field-label" for="notif-body">Body</label>
      <input id="notif-body" class="field-input" type="text" bind:value={body} />
    </div>
  </div>

  <div class="btn-group">
    <button class="action-btn" onclick={sendPlain} disabled={loading}>
      <span class="btn-icon">🔔</span>
      <span class="btn-text">
        <span class="btn-name">Send plain</span>
        <span class="btn-hint">{'send({ title, body })'}</span>
      </span>
    </button>
    <button class="action-btn" onclick={sendWithActions} disabled={loading}>
      <span class="btn-icon">☕</span>
      <span class="btn-text">
        <span class="btn-name">Send with actions</span>
        <span class="btn-hint">Extend 30m · Stop now</span>
      </span>
    </button>
    <button class="action-btn" onclick={dismissLast} disabled={!lastSentId || loading}>
      <span class="btn-icon">✖️</span>
      <span class="btn-text">
        <span class="btn-name">Dismiss last</span>
        <span class="btn-hint">{lastSentId || 'no notification sent yet'}</span>
      </span>
    </button>
  </div>

  <div class="output-area">
    <span class="output-label">OUTPUT</span>
    {#if loading}
      <div class="output-body muted">Sending…</div>
    {:else if output}
      <div class="output-body" class:ok={outputOk} class:err={!outputOk}>{output}</div>
    {:else}
      <div class="output-body muted">Fill in the fields and send — try both buttons</div>
    {/if}
  </div>

  <div class="log-area">
    <div class="log-header">
      <span class="output-label">ACTION LOG</span>
      <button class="link-btn" onclick={clearLog} disabled={log.length === 0}>Clear</button>
    </div>
    {#if log.length === 0}
      <div class="output-body muted">
        Click <strong>Send with actions</strong>, then click a button on the OS notification. Dispatches will show up here.
      </div>
    {:else}
      <ul class="log-list">
        {#each [...log].reverse() as entry}
          <li class="log-item">
            <span class="log-time">{formatTime(entry.at)}</span>
            <span class="log-note">{entry.note}</span>
            <span class="log-cmd">{entry.commandId}{entry.args && Object.keys(entry.args).length ? ' ' + JSON.stringify(entry.args) : ''}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<style>
  @import './section.css';

  .fields {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .log-area {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 8px;
  }

  .log-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .link-btn {
    background: none;
    border: none;
    color: var(--color-accent, #888);
    cursor: pointer;
    font-size: 12px;
  }

  .link-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .log-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 180px;
    overflow-y: auto;
  }

  .log-item {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 8px;
    padding: 4px 8px;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.05);
    font-size: 12px;
  }

  .log-time {
    font-variant-numeric: tabular-nums;
    opacity: 0.7;
  }

  .log-cmd {
    font-family: var(--font-mono, monospace);
    opacity: 0.75;
  }
</style>
