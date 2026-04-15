<script lang="ts">
  // ──────────────────────────────────────────────────────────────────────
  // PreferencesSection — demonstrates the declarative preferences system.
  //
  // The preferences live in manifest.json under the root `preferences` field.
  // The host auto-generates a form in Settings → Extensions → SDK Playground
  // so the user can edit them without any UI from this extension.
  //
  // This component shows how to:
  //   1. Read the initial snapshot from context.preferences
  //   2. Subscribe to `onPreferencesChanged` to react when the user edits
  //      values in Settings — the callback takes no args, you re-read from
  //      context.preferences which already holds the fresh frozen snapshot.
  //   3. Handle password-type values (they are decrypted before delivery).
  //
  // Extensions that don't cache preferences into state can skip the
  // subscription entirely — reading `context.preferences.X` on each use
  // always returns the latest value.
  // ──────────────────────────────────────────────────────────────────────
  import { onDestroy } from 'svelte';
  import type { ExtensionContext } from 'asyar-sdk';

  interface Props {
    context: ExtensionContext;
  }
  let { context }: Props = $props();

  // Cache the snapshot into reactive local state so the UI updates when
  // preferences change. The alternative — reading
  // context.preferences.values.X inside each template expression — also
  // works, but without an $effect or subscription the template wouldn't
  // re-evaluate on change.
  let snapshot = $state<Record<string, unknown>>({ ...context.preferences.values });

  const unsubscribe = context.onPreferencesChanged(() => {
    // The callback fires AFTER context.preferences.values is replaced
    // with the new frozen snapshot. Spread it into our local state so
    // Svelte picks up the change.
    snapshot = { ...context.preferences.values };
  });

  onDestroy(() => unsubscribe());

  // Derived helpers for display.
  let displayName = $derived<string>((snapshot.displayName as string) ?? '');
  let accentColor = $derived<string>((snapshot.accentColor as string) ?? 'purple');
  let logVerbosely = $derived<boolean>(Boolean(snapshot.logVerbosely));
  let maxResults = $derived<number>((snapshot.maxResults as number) ?? 10);
  let apiKeyMasked = $derived<string>(
    typeof snapshot.apiKey === 'string' && snapshot.apiKey
      ? '•'.repeat(Math.min(snapshot.apiKey.length, 12))
      : '— not set —'
  );

  function openSettings() {
    // Best-effort: post a message the host may handle to navigate to the
    // Extensions settings tab. The actual navigation happens on the host
    // side via extensionManager + settingsService.
    window.parent.postMessage(
      { type: 'asyar:navigate-settings-tab', payload: { tab: 'extensions' } },
      '*'
    );
  }
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">Preferences</span>
      <span class="section-desc">
        Declarative settings from <code>manifest.json</code>. Edit in
        Settings → Extensions → SDK Playground.
      </span>
    </div>
  </header>

  <div class="prefs-grid">
    <div class="pref-row">
      <span class="pref-label">Display name (textfield)</span>
      <span class="pref-value">{displayName || '— empty —'}</span>
    </div>

    <div class="pref-row">
      <span class="pref-label">Accent color (dropdown)</span>
      <span class="pref-value">
        <span class="swatch" style="background: var(--accent-{accentColor})"></span>
        {accentColor}
      </span>
    </div>

    <div class="pref-row">
      <span class="pref-label">Verbose logging (checkbox)</span>
      <span class="pref-value">{logVerbosely ? '✓ enabled' : '✗ disabled'}</span>
    </div>

    <div class="pref-row">
      <span class="pref-label">Max results (number)</span>
      <span class="pref-value">{maxResults}</span>
    </div>

    <div class="pref-row">
      <span class="pref-label">API key (password, encrypted)</span>
      <span class="pref-value mono">{apiKeyMasked}</span>
    </div>
  </div>

  <div class="btn-row">
    <button class="action-btn" onclick={openSettings}>
      <span class="btn-icon">⚙️</span>
      <span class="btn-text">
        <span class="btn-name">Open settings tab</span>
        <span class="btn-hint">Navigate the host to edit these values</span>
      </span>
    </button>
  </div>

  <div class="output-area">
    <span class="output-label">LIVE UPDATES</span>
    <div class="output-body muted">
      Edit any value in Settings → Extensions. This panel re-renders
      immediately via <code>onPreferencesChanged</code>, without
      reloading the iframe.
    </div>
  </div>
</div>

<style>
  @import './section.css';

  .prefs-grid {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .pref-row {
    display: grid;
    grid-template-columns: 180px 1fr;
    gap: 12px;
    padding: 8px 10px;
    background: var(--bg-secondary);
    border-radius: 6px;
    font-size: 12px;
    align-items: center;
  }

  .pref-label {
    color: var(--text-secondary);
    font-weight: 500;
  }

  .pref-value {
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .pref-value.mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  .swatch {
    display: inline-block;
    width: 14px;
    height: 14px;
    border-radius: 3px;
    border: 1px solid var(--border-color);
    background: #a855f7;
  }
</style>
