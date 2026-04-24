<script lang="ts">
  import { onMount } from 'svelte';
  import type {
    ExtensionContext,
    IActionService,
    IFeedbackService,
    INotificationService,
  } from 'asyar-sdk/view';
  import FeedbackSection from '../sections/FeedbackSection.svelte';
  import SelectionSection from '../sections/SelectionSection.svelte';
  import ClipboardSection from '../sections/ClipboardSection.svelte';
  import NotificationSection from '../sections/NotificationSection.svelte';
  import StorageSection from '../sections/StorageSection.svelte';
  import NetworkSection from '../sections/NetworkSection.svelte';
  import AISection from '../sections/AISection.svelte';
  import OAuthSection from '../sections/OAuthSection.svelte';
  import ShellSection from '../sections/ShellSection.svelte';
  import FileManagerSection from '../sections/FileManagerSection.svelte';
  import InteropSection from '../sections/InteropSection.svelte';
  import SchedulingSection from '../sections/SchedulingSection.svelte';
  import CacheSection from '../sections/CacheSection.svelte';
  import PreferencesSection from '../sections/PreferencesSection.svelte';
  import ApplicationSection from '../sections/ApplicationSection.svelte';
  import CommandMetadataSection from '../sections/CommandMetadataSection.svelte';
  import PowerSection from '../sections/PowerSection.svelte';
  import SystemEventsSection from '../sections/SystemEventsSection.svelte';
  import StatusBarSection from '../sections/StatusBarSection.svelte';
  import TimersSection from '../sections/TimersSection.svelte';

  interface Props {
    context: ExtensionContext;
  }
  let { context }: Props = $props();

  let activeTab = $state('preferences');

  const tabs = [
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
    { id: 'feedback',    label: 'Feedback',    icon: '🍞' },
    { id: 'selection',   label: 'Selection',   icon: '✂️' },
    { id: 'clipboard',   label: 'Clipboard',   icon: '📋' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'storage',     label: 'Storage',     icon: '📦' },
    { id: 'network',     label: 'Network',     icon: '🌐' },
    { id: 'ai',          label: 'AI',          icon: '🤖' },
    { id: 'oauth',       label: 'OAuth',       icon: '🔑' },
    { id: 'shell',       label: 'Shell',       icon: '🐚' },
    { id: 'filemanager', label: 'File Manager', icon: '📁' },
    { id: 'interop',     label: 'Interop',     icon: '🔗' },
    { id: 'scheduling',  label: 'Scheduling',  icon: '⏱️' },
    { id: 'cache',       label: 'Cache',       icon: '⚡' },
    { id: 'application', label: 'Application', icon: '🎯' },
    { id: 'cmdmeta', label: 'Cmd Metadata', icon: '🏷️' },
    { id: 'power',       label: 'Power',       icon: '☕' },
    { id: 'sysevents',   label: 'System Events', icon: '📡' },
    { id: 'statusbar',   label: 'Status Bar',  icon: '🧭' },
    { id: 'timers',      label: 'Timers',      icon: '⏰' },
  ];

  // ───────────────────────────────────────────────────────────────────────
  // Manifest-action handlers. Registered here because the worker has no
  // IActionService (§4.1 resolution). Root actions become available AFTER
  // the view has been mounted at least once in this launcher session.
  // ───────────────────────────────────────────────────────────────────────
  onMount(() => {
    const actionService = context.getService<IActionService>('actions');
    const feedback = context.getService<IFeedbackService>('feedback');
    const notification = context.getService<INotificationService>('notifications');

    actionService.registerActionHandler('send-notification', async () => {
      await notification.send({
        title: 'SDK Playground',
        body: 'Manifest-declared action fired from the ⌘K drawer',
      });
    });
    actionService.registerActionHandler('show-hud', async () => {
      await feedback.showHUD('\u{1F44B} HUD fired from ⌘K manifest-declared action');
    });
    actionService.registerActionHandler('reset-tick-log', async () => {
      await context.request('clearLog', { logKey: 'logs.scheduling' });
      await feedback.showHUD('\u{1F5D1}\u{FE0F} Tick log cleared');
    });
    actionService.registerActionHandler('trigger-now', async () => {
      await context.request('simulateScheduledTick', { commandId: 'tick-test' });
      await feedback.showHUD('\u{25B6}\u{FE0F} Tick fired manually');
    });
  });
</script>

<div class="root">
  <!-- Tab bar -->
  <nav class="tabbar">
    {#each tabs as tab}
      <button
        class="tab"
        class:active={activeTab === tab.id}
        onclick={() => activeTab = tab.id}
      >
        <span class="tab-icon">{tab.icon}</span>
        <span class="tab-label">{tab.label}</span>
      </button>
    {/each}
  </nav>

  <!-- Content -->
  <div class="content">
    {#if activeTab === 'preferences'}
      <PreferencesSection {context} />
    {:else if activeTab === 'feedback'}
      <FeedbackSection {context} />
    {:else if activeTab === 'selection'}
      <SelectionSection {context} />
    {:else if activeTab === 'clipboard'}
      <ClipboardSection {context} />
    {:else if activeTab === 'notifications'}
      <NotificationSection {context} />
    {:else if activeTab === 'storage'}
      <StorageSection {context} />
    {:else if activeTab === 'network'}
      <NetworkSection {context} />
    {:else if activeTab === 'ai'}
      <AISection {context} />
    {:else if activeTab === 'oauth'}
      <OAuthSection {context} />
    {:else if activeTab === 'shell'}
      <ShellSection {context} />
    {:else if activeTab === 'filemanager'}
      <FileManagerSection {context} />
    {:else if activeTab === 'interop'}
      <InteropSection {context} />
    {:else if activeTab === 'scheduling'}
      <SchedulingSection {context} />
    {:else if activeTab === 'cache'}
      <CacheSection {context} />
    {:else if activeTab === 'application'}
      <ApplicationSection {context} />
    {:else if activeTab === 'cmdmeta'}
      <CommandMetadataSection {context} />
    {:else if activeTab === 'power'}
      <PowerSection {context} />
    {:else if activeTab === 'sysevents'}
      <SystemEventsSection {context} />
    {:else if activeTab === 'statusbar'}
      <StatusBarSection {context} />
    {:else if activeTab === 'timers'}
      <TimersSection {context} />
    {/if}
  </div>
</div>

<style>
  .root {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-family: inherit;
  }

  .tabbar {
    display: flex;
    gap: 2px;
    padding: 8px 12px 0;
    border-bottom: 1px solid var(--separator);
    overflow-x: auto;
    scrollbar-width: none;
    flex-shrink: 0;
  }
  .tabbar::-webkit-scrollbar { display: none; }

  .tab {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px 7px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    white-space: nowrap;
    transition: color 0.15s, border-color 0.15s;
    border-radius: 0;
  }
  .tab:hover { color: var(--text-primary); }
  .tab.active {
    color: var(--accent-primary);
    border-bottom-color: var(--accent-primary);
  }

  .tab-icon { font-size: 12px; line-height: 1; }
  .tab-label { line-height: 1; }

  .content {
    flex: 1;
    overflow: hidden;
    position: relative;
  }
</style>
