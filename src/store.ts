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
  ICommandService,
  IPowerService,
  ISystemEventsService,
  IStatusBarService,
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
  command:      null as unknown as ICommandService,
  power:        null as unknown as IPowerService,
  systemEvents: null as unknown as ISystemEventsService,
  statusBar:    null as unknown as IStatusBarService,
};

// ── Status-bar (tray) click log ─────────────────────────────────────────────

export interface StatusBarClickLogEntry {
  timestamp: Date;
  itemPath: string[];
  checked?: boolean;
  /** Human-readable label for the section's log list. */
  note: string;
}

const statusBarListeners = new Set<() => void>();

function fire() {
  statusBarListeners.forEach((fn) => fn());
}

/**
 * Module-scoped state so the Status Bar section's UI survives tab
 * switches (Svelte unmounts/remounts the section when the user navigates
 * to other tabs, which would otherwise reset `coffeeRegistered` etc.).
 */
export const statusBar = {
  log: [] as StatusBarClickLogEntry[],
  coffeeRegistered: false,
  musicRegistered: false,
  lastError: '' as string,

  record(entry: StatusBarClickLogEntry) {
    statusBar.log = [...statusBar.log, entry].slice(-25);
    fire();
  },

  setRegistered(id: 'coffee' | 'music', value: boolean) {
    if (id === 'coffee') statusBar.coffeeRegistered = value;
    else statusBar.musicRegistered = value;
    fire();
  },

  setError(msg: string) {
    statusBar.lastError = msg;
    fire();
  },

  clear() {
    statusBar.log = [];
    fire();
  },

  subscribe(fn: () => void): () => void {
    statusBarListeners.add(fn);
    return () => statusBarListeners.delete(fn);
  },
};

// ── Notification action click log ───────────────────────────────────────────

export interface NotificationActionLogEntry {
  timestamp: Date;
  commandId: string;
  args: Record<string, unknown>;
  note: string;
}

const notifActionListeners = new Set<() => void>();

function fireNotif() {
  notifActionListeners.forEach((fn) => fn());
}

/**
 * Module-scoped state so the Notification section's action log survives
 * tab switches — the Tier 2 iframe keeps the extension alive so the log
 * grows across remounts.
 */
export const notifActions = {
  log: [] as NotificationActionLogEntry[],
  lastSentId: '' as string,

  record(entry: NotificationActionLogEntry) {
    notifActions.log = [...notifActions.log, entry].slice(-25);
    fireNotif();
  },

  setLastSentId(id: string) {
    notifActions.lastSentId = id;
    fireNotif();
  },

  clear() {
    notifActions.log = [];
    fireNotif();
  },

  subscribe(fn: () => void): () => void {
    notifActionListeners.add(fn);
    return () => notifActionListeners.delete(fn);
  },
};

// ── Background scheduling tick log ──────────────────────────────────────────

export interface TickEvent {
  timestamp: Date;
  /** true when fired by the platform timer, false when triggered manually */
  isScheduled: boolean;
  /** Which scheduled command produced this tick (e.g. 'tick-test' or 'tick-test-fast') */
  commandId: string;
  args: Record<string, any>;
}

const tickListeners = new Set<(e: TickEvent) => void>();

export const scheduling = {
  log: [] as TickEvent[],

  /** Called by the extension's executeCommand() whenever a scheduled tick runs. */
  recordTick(commandId: string, args: Record<string, any>) {
    const event: TickEvent = {
      timestamp: new Date(),
      isScheduled: args?.scheduledTick === true,
      commandId,
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
