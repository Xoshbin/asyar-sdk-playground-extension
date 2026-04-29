// ───────────────────────────────────────────────────────────────────────────
// view.ts — SDK Playground Tier 2 view entry, loaded by dist/view.html.
//
// Responsibilities (display-side only):
//   1) Register the view-side Extension impl so `open` navigates to
//      DefaultView.
//   2) Bootstrap ExtensionContext, post asyar:extension:loaded, forward ⌘K.
//   3) Mount DefaultView.svelte when `?view=DefaultView`.
//
// Root actions + command-scoped actions register from DefaultView.svelte
// onMount (Pomodoro pattern — worker has no IActionService). This means they
// only become available AFTER the user has opened the view at least once in
// the current launcher session — a known regression documented in the audit
// §4.1 resolution.
// ───────────────────────────────────────────────────────────────────────────

import 'asyar-sdk/tokens.css';
import { mount } from 'svelte';
import {
  ExtensionContext,
  extensionBridge,
  registerIconElement,
  type Extension,
  type IExtensionManager,
} from 'asyar-sdk/view';
import manifest from '../manifest.json';
import DefaultView from './views/DefaultView.svelte';
import OnboardingView from './views/OnboardingView.svelte';

class SDKPlaygroundViewExtension implements Extension {
  private extensionManager?: IExtensionManager;

  async initialize(ctx: ExtensionContext): Promise<void> {
    this.extensionManager = ctx.getService<IExtensionManager>('extensions');
  }

  async activate(): Promise<void> {}
  async deactivate(): Promise<void> {}

  async executeCommand(commandId: string): Promise<unknown> {
    if (commandId === 'open') {
      this.extensionManager?.navigateToView('org.asyar.sdk-playground/DefaultView');
      return { type: 'view', viewPath: 'org.asyar.sdk-playground/DefaultView' };
    }
    if (commandId === 'setup-onboarding') {
      this.extensionManager?.navigateToView('org.asyar.sdk-playground/OnboardingView');
      return { type: 'view', viewPath: 'org.asyar.sdk-playground/OnboardingView' };
    }
    return undefined;
  }

  onUnload = (): void => {};
}

const extensionId =
  window.location.hostname === 'localhost' ||
  window.location.hostname === 'asyar-extension.localhost'
    ? window.location.pathname.split('/').filter(Boolean)[0] ||
      'org.asyar.sdk-playground'
    : window.location.hostname || 'org.asyar.sdk-playground';

const context = new ExtensionContext();
context.setExtensionId(extensionId);
registerIconElement();

const viewExtension = new SDKPlaygroundViewExtension();
extensionBridge.registerManifest(
  manifest as Parameters<typeof extensionBridge.registerManifest>[0],
);
extensionBridge.registerExtensionImplementation(extensionId, viewExtension);

// Forward ⌘K to host so the action palette opens while focus is inside the
// iframe.
window.addEventListener('keydown', (event) => {
  const isCommandK = (event.metaKey || event.ctrlKey) && event.key === 'k';
  if (isCommandK) {
    event.preventDefault();
    window.parent.postMessage(
      {
        type: 'asyar:extension:keydown',
        payload: {
          key: event.key,
          metaKey: event.metaKey,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
        },
      },
      '*',
    );
  }
});

void (async () => {
  await viewExtension.initialize(context);
  await viewExtension.activate();
})();

const viewName = new URLSearchParams(window.location.search).get('view');
const target = document.getElementById('app');
if (viewName === 'DefaultView' && target) {
  mount(DefaultView, {
    target,
    props: { context },
  });
} else if (viewName === 'OnboardingView' && target) {
  mount(OnboardingView, {
    target,
    props: { context },
  });
}
