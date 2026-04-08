<script lang="ts">
  import FeedbackSection from './sections/FeedbackSection.svelte';
  import SelectionSection from './sections/SelectionSection.svelte';
  import ClipboardSection from './sections/ClipboardSection.svelte';
  import NotificationSection from './sections/NotificationSection.svelte';
  import StorageSection from './sections/StorageSection.svelte';
  import NetworkSection from './sections/NetworkSection.svelte';

  let activeTab = $state('feedback');

  const tabs = [
    { id: 'feedback',      label: 'Feedback',      icon: '🍞' },
    { id: 'selection',     label: 'Selection',      icon: '✂️' },
    { id: 'clipboard',     label: 'Clipboard',      icon: '📋' },
    { id: 'notifications', label: 'Notifications',  icon: '🔔' },
    { id: 'storage',       label: 'Storage',        icon: '📦' },
    { id: 'network',       label: 'Network',        icon: '🌐' },
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
    {#if activeTab === 'feedback'}
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
