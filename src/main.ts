import { mount } from 'svelte';
import { ExtensionContext } from 'asyar-sdk';
import extension, { DefaultView } from './index';

// The hostname of asyar-extension://org.asyar.sdk-playground/... is the extension ID
const extensionId = window.location.hostname || 'org.asyar.sdk-playground';

(async () => {
  const context = new ExtensionContext();
  context.setExtensionId(extensionId);

  // Initialize the extension — populates svc.* before the view renders
  await extension.initialize(context);
  await extension.activate();

  // Mount the view
  mount(DefaultView, { target: document.getElementById('app')! });

  // Forward lifecycle events from the host
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

  // Signal to the host that this extension is ready
  window.parent.postMessage({ type: 'asyar:extension:loaded', extensionId }, '*');
})();
