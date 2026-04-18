<script lang="ts">
  import type { ExtensionContext } from 'asyar-sdk';
  import FeedbackSection from './sections/FeedbackSection.svelte';
  import SelectionSection from './sections/SelectionSection.svelte';
  import ClipboardSection from './sections/ClipboardSection.svelte';
  import NotificationSection from './sections/NotificationSection.svelte';
  import StorageSection from './sections/StorageSection.svelte';
  import NetworkSection from './sections/NetworkSection.svelte';
  import AISection from './sections/AISection.svelte';
  import OAuthSection from './sections/OAuthSection.svelte';
  import ShellSection from './sections/ShellSection.svelte';
  import FileManagerSection from './sections/FileManagerSection.svelte';
  import InteropSection from './sections/InteropSection.svelte';
  import SchedulingSection from './sections/SchedulingSection.svelte';
  import CacheSection from './sections/CacheSection.svelte';
  import PreferencesSection from './sections/PreferencesSection.svelte';
  import ApplicationSection from './sections/ApplicationSection.svelte';
  import CommandMetadataSection from './sections/CommandMetadataSection.svelte';
  import PowerSection from './sections/PowerSection.svelte';
  import SystemEventsSection from './sections/SystemEventsSection.svelte';
  import StatusBarSection from './sections/StatusBarSection.svelte';
  import TimersSection from './sections/TimersSection.svelte';

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
      <FeedbackSection />
    {:else if activeTab === 'selection'}
      <SelectionSection />
    {:else if activeTab === 'clipboard'}
      <ClipboardSection />
    {:else if activeTab === 'notifications'}
      <NotificationSection />
    {:else if activeTab === 'storage'}
      <StorageSection />
    {:else if activeTab === 'network'}
      <NetworkSection />
    {:else if activeTab === 'ai'}
      <AISection />
    {:else if activeTab === 'oauth'}
      <OAuthSection />
    {:else if activeTab === 'shell'}
      <ShellSection />
    {:else if activeTab === 'filemanager'}
      <FileManagerSection />
    {:else if activeTab === 'interop'}
      <InteropSection />
    {:else if activeTab === 'scheduling'}
      <SchedulingSection />
    {:else if activeTab === 'cache'}
      <CacheSection />
    {:else if activeTab === 'application'}
      <ApplicationSection />
    {:else if activeTab === 'cmdmeta'}
      <CommandMetadataSection />
    {:else if activeTab === 'power'}
      <PowerSection />
    {:else if activeTab === 'sysevents'}
      <SystemEventsSection />
    {:else if activeTab === 'statusbar'}
      <StatusBarSection />
    {:else if activeTab === 'timers'}
      <TimersSection />
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
