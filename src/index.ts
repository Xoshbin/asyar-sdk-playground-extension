import type {
  Extension,
  ExtensionContext,
  IFeedbackService,
  ISelectionService,
  IClipboardHistoryService,
  INotificationService,
  IStorageService,
  INetworkService,
  IExtensionManager,
  IAIService,
  IOAuthService,
  IShellService,
  IFileManagerService,
  IInteropService,
  ICacheService,
  IApplicationService,
  ICommandService,
  IActionService,
  IPowerService,
} from 'asyar-sdk';
import { svc, scheduling } from './store';
import DefaultView from './DefaultView.svelte';

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

class SDKPlaygroundExtension implements Extension {
  private extensionManager?: IExtensionManager;

  async initialize(context: ExtensionContext) {
    this.extensionManager = context.getService<IExtensionManager>('extensions');
    svc.feedback     = context.getService<IFeedbackService>('feedback');
    svc.selection    = context.getService<ISelectionService>('selection');
    svc.clipboard    = context.getService<IClipboardHistoryService>('clipboard');
    svc.notification = context.getService<INotificationService>('notifications');
    svc.storage      = context.getService<IStorageService>('storage');
    svc.network      = context.getService<INetworkService>('network');
    svc.ai           = context.getService<IAIService>('ai');
    svc.oauth        = context.getService<IOAuthService>('oauth');
    svc.shell        = context.getService<IShellService>('shell');
    svc.fileManager  = context.getService<IFileManagerService>('fs');
    svc.interop      = context.getService<IInteropService>('interop');
    svc.cache        = context.getService<ICacheService>('cache');
    svc.application  = context.getService<IApplicationService>('application');
    svc.command      = context.getService<ICommandService>('commands');
    svc.power        = context.getService<IPowerService>('power');

    // Register manifest-declared action handlers. The host registered these
    // actions from manifest.json; we wire the execute logic here so the relay
    // path (asyar:action:execute → ExtensionBridge → handler) works.
    const actionService = context.getService<IActionService>('actions');
    actionService.registerActionHandler('send-notification', async () => {
      await svc.notification.notify({
        title: 'SDK Playground',
        body: 'Manifest-declared action fired from the ⌘K drawer',
      });
    });
    actionService.registerActionHandler('show-hud', async () => {
      await svc.feedback.showHUD('👋 HUD fired from ⌘K manifest-declared action');
    });
    actionService.registerActionHandler('reset-tick-log', async () => {
      scheduling.log = [];
      await svc.feedback.showHUD('🗑️ Tick log cleared');
    });
    actionService.registerActionHandler('trigger-now', async () => {
      await this.executeCommand('tick-test', { scheduledTick: false });
      await svc.feedback.showHUD('▶️ Tick fired manually');
    });

    console.log('[SDKPlayground] Initialized');
  }

  async activate(): Promise<void> {}
  async deactivate(): Promise<void> {}
  async viewActivated(_viewId: string): Promise<void> {}
  async viewDeactivated(_viewId: string): Promise<void> {}

  async executeCommand(commandId: string, args?: Record<string, any>): Promise<any> {
    if (commandId === 'open') {
      this.extensionManager?.navigateToView('org.asyar.sdk-playground/DefaultView');
      return { type: 'view', viewPath: 'org.asyar.sdk-playground/DefaultView' };
    }
    if (commandId === 'tick-test' || commandId === 'tick-test-fast') {
      scheduling.recordTick(commandId, args ?? {});
      const log = scheduling.log;
      const ticksForCommand = log.filter(t => t.commandId === commandId);
      const last = ticksForCommand[ticksForCommand.length - 1];
      const subtitle = last
        ? `Ticked ${ticksForCommand.length} times · Last: ${formatTime(last.timestamp)}`
        : undefined;
      svc.command?.updateCommandMetadata(commandId, { subtitle }).catch(console.error);
    }
  }

  onUnload = () => {};
}

export default new SDKPlaygroundExtension();
export { DefaultView };
