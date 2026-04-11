// ───────────────────────────────────────────────────────────────────────────
// main.ts — Tier 2 extension bootstrap
//
// This is the canonical bootstrap flow for a sandboxed Tier 2 extension
// that mounts a view. Every third-party extension should follow the same
// shape, with optional steps for search (`asyar:search:request` handler)
// or scheduled commands (handled in `index.ts executeCommand`).
//
//   1. Parse extensionId from the asyar-extension://{id}/ URL
//   2. Create the ExtensionContext — a SINGLE instance per iframe
//   3. Call context.setExtensionId(id) — this also self-registers the
//      context with the iframe's ExtensionBridge, so the preferences
//      listener can find it and call setPreferences(bundle) on the
//      live context when the host replies to asyar:extension:loaded.
//   4. Run extension.initialize(context) — resolve service proxies and
//      wire up any cross-cutting state (e.g. svc.* in this playground).
//   5. Mount the Svelte view component, passing `context` (or resolved
//      services) as props so children never construct their own context.
//   6. Post asyar:extension:loaded to the host. The host replies with
//      asyar:event:preferences:set-all containing the extension's
//      resolved preferences bundle. ExtensionBridge routes the message
//      to context.setPreferences, which installs a frozen snapshot and
//      fires any onPreferencesChanged listeners.
//
// You do NOT need to await the preferences bundle before mounting. The
// snapshot arrives asynchronously and triggers reactivity via the
// change callback. Components that read preferences at render time
// should fall back to defaults if they land before the snapshot.
// ───────────────────────────────────────────────────────────────────────────

import { mount } from 'svelte';
import { ExtensionContext } from 'asyar-sdk';
import extension, { DefaultView } from './index';

// The hostname of asyar-extension://org.asyar.sdk-playground/... is the extension ID
const extensionId = window.location.hostname || 'org.asyar.sdk-playground';

(async () => {
  const context = new ExtensionContext();
  context.setExtensionId(extensionId);

  // Resolve services and populate svc.* before mounting the view so
  // components can use svc.feedback, svc.storage, etc. synchronously.
  await extension.initialize(context);
  await extension.activate();

  // Mount the view. We pass `context` so the Preferences section can
  // subscribe to `onPreferencesChanged` and react to live updates from
  // the Settings window.
  mount(DefaultView, {
    target: document.getElementById('app')!,
    props: { context },
  });

  // Forward host-originated view lifecycle events so the extension can
  // react to the user opening or leaving the view.
  window.addEventListener('message', async (event: MessageEvent) => {
    const { type, payload } = event.data ?? {};
    if (!type) return;
    try {
      if (type === 'asyar:view:activated') {
        await extension.viewActivated?.(payload?.viewPath);
      } else if (type === 'asyar:view:deactivated') {
        await extension.viewDeactivated?.(payload?.viewPath);
      }
    } catch (e) {
      console.error(`[SDKPlayground] Error handling ${type}:`, e);
    }
  });

  // Signal readiness to the host. The host replies with the initial
  // preferences bundle via asyar:event:preferences:set-all, which
  // ExtensionBridge delivers to context.setPreferences.
  window.parent.postMessage({ type: 'asyar:extension:loaded', extensionId }, '*');
})();
