<script lang="ts">
  import type {
    ExtensionContext,
    ICalendarService,
    CalendarSource,
    CalendarEvent,
    ReminderList,
    ReminderItem,
  } from 'asyar-sdk/view';

  interface Props {
    context: ExtensionContext;
  }
  let { context }: Props = $props();

  const calendar = $derived(context.getService<ICalendarService>('calendar'));

  const DAY_MS = 24 * 60 * 60 * 1000;

  let loading = $state(false);
  let output = $state('');
  let outputOk = $state(true);
  let calendars = $state<CalendarSource[]>([]);
  let events = $state<CalendarEvent[]>([]);
  let reminderLists = $state<ReminderList[]>([]);
  let reminders = $state<ReminderItem[]>([]);
  let includeCompleted = $state(false);

  function setOutput(msg: string, ok = true) {
    output = msg;
    outputOk = ok;
  }

  function fmt(ms: number | null): string {
    return ms == null ? '–' : new Date(ms).toLocaleString();
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

  const listCalendars = () =>
    run('listCalendars', async () => {
      calendars = await calendar.listCalendars();
      setOutput(`✓ ${calendars.length} calendar(s)`);
    });

  const listEvents = () =>
    run('listEvents', async () => {
      const now = Date.now();
      events = await calendar.listEvents(now, now + 7 * DAY_MS);
      setOutput(`✓ ${events.length} event(s) in the next 7 days`);
    });

  const createEvent = () =>
    run('createEvent', async () => {
      const start = Date.now() + 60 * 60 * 1000;
      const created = await calendar.createEvent({
        title: 'Asyar playground test event',
        startAt: start,
        endAt: start + 30 * 60 * 1000,
        notes: 'Created by the Asyar SDK playground. Safe to delete.',
      });
      setOutput(`✓ Created "${created.title}" in ${created.calendarTitle} at ${fmt(created.startAt)}`);
      events = await calendar.listEvents(Date.now(), Date.now() + 7 * DAY_MS);
    });

  const listReminderLists = () =>
    run('listReminderLists', async () => {
      reminderLists = await calendar.listReminderLists();
      setOutput(`✓ ${reminderLists.length} reminder list(s)`);
    });

  const loadReminders = async () => {
    reminders = await calendar.listReminders(undefined, includeCompleted);
  };

  const listReminders = () =>
    run('listReminders', async () => {
      await loadReminders();
      setOutput(`✓ ${reminders.length} reminder(s)`);
    });

  const createReminder = () =>
    run('createReminder', async () => {
      const created = await calendar.createReminder({
        title: 'Asyar playground test reminder',
        dueAt: Date.now() + DAY_MS,
        notes: 'Created by the Asyar SDK playground. Safe to delete.',
      });
      setOutput(`✓ Created "${created.title}" in ${created.listTitle}`);
      await loadReminders();
    });

  const toggle = (r: ReminderItem) =>
    run('setReminderCompleted', async () => {
      const updated = await calendar.setReminderCompleted(r.id, !r.isCompleted);
      setOutput(`✓ "${updated.title}" is now ${updated.isCompleted ? 'completed' : 'not completed'}`);
      await loadReminders();
    });
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">Calendar & Reminders</span>
      <span class="section-desc">
        Read and create events and reminders through EventKit (macOS). The first call asks for
        Calendar or Reminders access.
      </span>
    </div>
  </header>

  <div class="btn-row">
    <button class="action-btn" onclick={listCalendars} disabled={loading}>
      <span class="btn-icon">📅</span>
      <span class="btn-text">
        <span class="btn-name">List Calendars</span>
        <span class="btn-hint">calendar.listCalendars()</span>
      </span>
    </button>
    <button class="action-btn" onclick={listEvents} disabled={loading}>
      <span class="btn-icon">🗓️</span>
      <span class="btn-text">
        <span class="btn-name">Next 7 Days</span>
        <span class="btn-hint">calendar.listEvents(now, +7d)</span>
      </span>
    </button>
    <button class="action-btn" onclick={createEvent} disabled={loading}>
      <span class="btn-icon">➕</span>
      <span class="btn-text">
        <span class="btn-name">Create Test Event</span>
        <span class="btn-hint">calendar.createEvent(input)</span>
      </span>
    </button>
  </div>

  <div class="btn-row">
    <button class="action-btn" onclick={listReminderLists} disabled={loading}>
      <span class="btn-icon">📋</span>
      <span class="btn-text">
        <span class="btn-name">List Reminder Lists</span>
        <span class="btn-hint">calendar.listReminderLists()</span>
      </span>
    </button>
    <button class="action-btn" onclick={listReminders} disabled={loading}>
      <span class="btn-icon">✅</span>
      <span class="btn-text">
        <span class="btn-name">List Reminders</span>
        <span class="btn-hint">calendar.listReminders(undefined, includeCompleted)</span>
      </span>
    </button>
    <button class="action-btn" onclick={createReminder} disabled={loading}>
      <span class="btn-icon">🔔</span>
      <span class="btn-text">
        <span class="btn-name">Create Test Reminder</span>
        <span class="btn-hint">calendar.createReminder(input)</span>
      </span>
    </button>
  </div>

  <label class="field">
    <span class="field-label">Include completed reminders</span>
    <input type="checkbox" bind:checked={includeCompleted} />
  </label>

  <div class="output-area">
    <span class="output-label">CALENDARS ({calendars.length})</span>
    {#each calendars as c (c.id)}
      <div class="output-body">
        <b>{c.title}</b>
        {c.sourceTitle ? `· ${c.sourceTitle}` : ''}
        {c.readOnly ? '· read-only' : ''}
      </div>
    {:else}
      <div class="output-body muted">Click List Calendars.</div>
    {/each}
  </div>

  <div class="output-area">
    <span class="output-label">EVENTS ({events.length})</span>
    {#each events as e (e.id + e.startAt)}
      <div class="output-body">
        <b>{e.title}</b> · {e.isAllDay ? 'all day' : fmt(e.startAt)} · {e.calendarTitle}
        {e.location ? `· ${e.location}` : ''}
      </div>
    {:else}
      <div class="output-body muted">Click Next 7 Days.</div>
    {/each}
  </div>

  <div class="output-area">
    <span class="output-label">REMINDER LISTS ({reminderLists.length})</span>
    {#each reminderLists as l (l.id)}
      <div class="output-body">
        <b>{l.title}</b>
        {l.sourceTitle ? `· ${l.sourceTitle}` : ''}
        {l.readOnly ? '· read-only' : ''}
      </div>
    {:else}
      <div class="output-body muted">Click List Reminder Lists.</div>
    {/each}
  </div>

  <div class="output-area">
    <span class="output-label">REMINDERS ({reminders.length}) — click to toggle</span>
    {#each reminders as r (r.id)}
      <button class="action-btn" onclick={() => toggle(r)} disabled={loading}>
        <span class="btn-icon">{r.isCompleted ? '☑️' : '⬜'}</span>
        <span class="btn-text">
          <span class="btn-name">{r.title}</span>
          <span class="btn-hint">{r.listTitle} · due {fmt(r.dueAt)}</span>
        </span>
      </button>
    {:else}
      <div class="output-body muted">Click List Reminders.</div>
    {/each}
  </div>

  <div class="output-area">
    <span class="output-label">OUTPUT</span>
    {#if loading}
      <div class="output-body muted">Working…</div>
    {:else if output}
      <div class="output-body" class:ok={outputOk} class:err={!outputOk}>{output}</div>
    {:else}
      <div class="output-body muted">Try the buttons above.</div>
    {/if}
  </div>
</div>

<style>
  @import './section.css';
</style>
