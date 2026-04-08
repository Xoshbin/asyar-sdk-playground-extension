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
} from 'asyar-sdk';
import { svc } from './store';
import DefaultView from './DefaultView.svelte';

class SDKPlaygroundExtension implements Extension {
  private extensionManager?: IExtensionManager;

  async initialize(context: ExtensionContext) {
    this.extensionManager = context.getService<IExtensionManager>('ExtensionManager');
    svc.feedback     = context.getService<IFeedbackService>('FeedbackService');
    svc.selection    = context.getService<ISelectionService>('SelectionService');
    svc.clipboard    = context.getService<IClipboardHistoryService>('ClipboardHistoryService');
    svc.notification = context.getService<INotificationService>('NotificationService');
    svc.storage      = context.getService<IStorageService>('StorageService');
    svc.network      = context.getService<INetworkService>('NetworkService');
    console.log('[SDKPlayground] Initialized');
  }

  async activate(): Promise<void> {}
  async deactivate(): Promise<void> {}
  async viewActivated(_viewId: string): Promise<void> {}
  async viewDeactivated(_viewId: string): Promise<void> {}

  async executeCommand(commandId: string, _args?: Record<string, any>): Promise<any> {
    if (commandId === 'open') {
      this.extensionManager?.navigateToView('org.asyar.sdk-playground/DefaultView');
      return { type: 'view', viewPath: 'org.asyar.sdk-playground/DefaultView' };
    }
  }

  onUnload = () => {};
}

export default new SDKPlaygroundExtension();
export { DefaultView };
