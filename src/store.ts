import type {
  IFeedbackService,
  ISelectionService,
  IClipboardHistoryService,
  INotificationService,
  IStorageService,
  INetworkService,
  IAIService,
  IOAuthService,
  IShellService,
  IFileManagerService,
  IInteropService,
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
  ai:           null as unknown as IAIService,
  oauth:        null as unknown as IOAuthService,
  shell:        null as unknown as IShellService,
  fileManager:  null as unknown as IFileManagerService,
  interop:      null as unknown as IInteropService,
};
