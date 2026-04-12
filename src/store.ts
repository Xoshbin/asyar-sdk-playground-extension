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
  ICacheService,
  IApplicationService,
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
  cache:        null as unknown as ICacheService,
  application:  null as unknown as IApplicationService,
};

// ── Background scheduling tick log ──────────────────────────────────────────

export interface TickEvent {
  timestamp: Date;
  /** true when fired by the platform timer, false when triggered manually */
  isScheduled: boolean;
  args: Record<string, any>;
}

const tickListeners = new Set<(e: TickEvent) => void>();

export const scheduling = {
  log: [] as TickEvent[],

  /** Called by the extension's executeCommand() whenever 'tick-test' runs. */
  recordTick(args: Record<string, any>) {
    const event: TickEvent = {
      timestamp: new Date(),
      isScheduled: args?.scheduledTick === true,
      args,
    };
    // Keep at most 50 entries
    scheduling.log = [...scheduling.log, event].slice(-50);
    tickListeners.forEach(fn => fn(event));
  },

  /** SchedulingSection registers a listener to get notified reactively. */
  subscribe(fn: (e: TickEvent) => void): () => void {
    tickListeners.add(fn);
    return () => tickListeners.delete(fn);
  },
};
