/**
 * Single source of truth for worker→view state contract keys and log caps.
 *
 * Worker writes at each key; view subscribes. Changing a string here changes
 * the wire-level key — both tiers must continue to agree.
 */

export const STATE_KEYS = {
  // Push-event logs (rolling, worker-owned).
  logsSystemEvents: 'logs.systemEvents',
  logsApplication: 'logs.application',
  logsScheduling: 'logs.scheduling',
  logsNotifActions: 'logs.notifActions',
  logsTimerFires: 'logs.timerFires',
  logsStatusBarClicks: 'logs.statusBarClicks',

  // Per-kind counters + last-payload.
  countersSystemEvents: 'counters.systemEvents',
  countersApplication: 'counters.application',

  // Subscription toggle flags (which kinds the worker is currently subscribed to).
  subsSystemEvents: 'subscriptions.systemEvents',
  subsApplication: 'subscriptions.application',

  // StatusBar demo state.
  statusBarRegistered: 'statusBar.registered',
  statusBarTray: 'statusBar.tray',
  statusBarLastError: 'statusBar.lastError',

  // Notification last-sent id (for dismiss button).
  notifLastSentId: 'notifActions.lastSentId',

  // greet's last output (§4.2 resolution: worker → notification; view mirrors).
  greetLast: 'greet.last',

  // FileSystemWatcher demo — worker owns the watch handle; view reads
  // event count / last payload via state subscription. Worker boot
  // re-starts from `fsWatchActive` so a launcher relaunch resumes the
  // user's last watch without view interaction.
  fsWatchActive: 'fsWatch.active',
  fsWatchEventCount: 'fsWatch.eventCount',
  fsWatchLastEvent: 'fsWatch.lastEvent',
  logsFsWatch: 'logs.fsWatch',
} as const;

export type StateKey = (typeof STATE_KEYS)[keyof typeof STATE_KEYS];

/** Log caps — worker tail-slices BEFORE writing, per plan §3.4. */
export const LOG_CAPS = {
  [STATE_KEYS.logsSystemEvents]: 50,
  [STATE_KEYS.logsApplication]: 50,
  [STATE_KEYS.logsScheduling]: 50,
  [STATE_KEYS.logsNotifActions]: 25,
  [STATE_KEYS.logsTimerFires]: 25,
  [STATE_KEYS.logsStatusBarClicks]: 25,
  [STATE_KEYS.logsFsWatch]: 25,
} as const;

// Shared wire types — the view MUST be able to import these without pulling
// any worker code, and the worker must not import UI helpers through them.

export interface TickEvent {
  at: number;
  /** true when the platform scheduler fired; false for manual simulate */
  isScheduled: boolean;
  /** 'tick-test' | 'tick-test-fast' */
  commandId: string;
  args: Record<string, unknown>;
}

export type SystemEventKind =
  | 'sleep'
  | 'wake'
  | 'lid-open'
  | 'lid-close'
  | 'battery-level-changed'
  | 'power-source-changed';

export interface SystemEventLogEntry {
  at: number;
  kind: SystemEventKind;
  payload: string;
}

export type ApplicationPushKind = 'launched' | 'terminated' | 'frontmost-changed';

export interface ApplicationLogEntry {
  at: number;
  kind: ApplicationPushKind;
  summary: string;
}

export interface NotifActionLogEntry {
  at: number;
  commandId: string;
  args: Record<string, unknown>;
  note: string;
}

export interface TimerFireLogEntry {
  at: number;
  commandId: string;
  args: Record<string, unknown>;
  note: string;
}

export interface StatusBarClickLogEntry {
  at: number;
  itemPath: string[];
  checked?: boolean;
  note: string;
}

export interface StatusBarTrayState {
  playing: boolean;
  muted: boolean;
  volumeLevel: 'low' | 'medium' | 'high';
}

export interface StatusBarRegisteredState {
  coffee: boolean;
  music: boolean;
}

export interface GreetLast {
  at: number;
  greeting: string;
  args: Record<string, unknown>;
}

export interface FsWatchActiveState {
  path: string;
  startedAt: number;
}

export interface FsWatchEventLogEntry {
  at: number;
  paths: string[];
}

export type CounterMap<K extends string> = Record<
  K,
  { count: number; last: string }
>;
