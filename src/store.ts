import type {
  IFeedbackService,
  ISelectionService,
  IClipboardHistoryService,
  INotificationService,
  IStorageService,
  INetworkService,
} from 'asyar-sdk';

/**
 * Module-level service registry.
 * Populated by the extension's initialize() in index.ts.
 * Imported directly by section components — lives here (not in index.ts)
 * to avoid circular dependencies.
 */
export const svc = {
  feedback:     null as unknown as IFeedbackService,
  selection:    null as unknown as ISelectionService,
  clipboard:    null as unknown as IClipboardHistoryService,
  notification: null as unknown as INotificationService,
  storage:      null as unknown as IStorageService,
  network:      null as unknown as INetworkService,
};
