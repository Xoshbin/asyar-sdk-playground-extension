export type FeedbackScenarioId =
  | 'bar-info'
  | 'bar-success'
  | 'bar-warning'
  | 'bar-error'
  | 'bar-error-details'
  | 'bar-long-message'
  | 'bar-deduplication'
  | 'bar-priority'
  | 'progress-indeterminate'
  | 'progress-determinate-success'
  | 'progress-failure'
  | 'progress-dismiss'
  | 'announcement'
  | 'hud-after-close'
  | 'confirmation-default'
  | 'confirmation-danger'
  | 'confirmation-concurrent'
  | 'background-plain'
  | 'background-actions'
  | 'background-dismiss'
  | 'fatal';

export interface FeedbackScenario {
  id: FeedbackScenarioId;
  title: string;
  hint: string;
  icon: string;
  danger?: boolean;
}

export interface FeedbackScenarioGroup {
  title: string;
  description: string;
  scenarios: readonly FeedbackScenario[];
}

export function feedbackAnnouncementIdForVersion(version: string): string {
  return `sdk-playground-feedback-announcement-${version}`;
}

export const FEEDBACK_SCENARIO_GROUPS: readonly FeedbackScenarioGroup[] = [
  {
    title: 'Feedback Bar',
    description: 'Severity, overflow, details, deduplication, and priority.',
    scenarios: [
      { id: 'bar-info', title: 'Information', hint: 'Blue informational feedback', icon: 'ℹ️' },
      { id: 'bar-success', title: 'Success', hint: 'Green completion feedback', icon: '✅' },
      { id: 'bar-warning', title: 'Warning', hint: 'Amber warning feedback', icon: '⚠️' },
      { id: 'bar-error', title: 'Error', hint: 'Recoverable error feedback', icon: '❌' },
      {
        id: 'bar-error-details',
        title: 'Error with details',
        hint: 'Details dialog and developer context',
        icon: '🔎',
      },
      {
        id: 'bar-long-message',
        title: 'Long scrolling text',
        hint: 'Exercises overflow motion and pauses',
        icon: '↔️',
      },
      {
        id: 'bar-deduplication',
        title: 'Duplicate coalescing',
        hint: 'Publishes the same feedback three times',
        icon: '🧬',
      },
      {
        id: 'bar-priority',
        title: 'Severity priority',
        hint: 'Queues info, warning, and error together',
        icon: '📊',
      },
    ],
  },
  {
    title: 'Progress',
    description: 'Indeterminate, determinate, completion, failure, and dismissal.',
    scenarios: [
      {
        id: 'progress-indeterminate',
        title: 'Start indeterminate',
        hint: 'Spinner remains until dismissed',
        icon: '⏳',
      },
      {
        id: 'progress-determinate-success',
        title: 'Determinate success',
        hint: 'Updates 1/3 through 3/3, then succeeds',
        icon: '📥',
      },
      {
        id: 'progress-failure',
        title: 'Progress failure',
        hint: 'Transitions spinner into an error',
        icon: '🛑',
      },
      {
        id: 'progress-dismiss',
        title: 'Dismiss active progress',
        hint: 'Closes the most recently started handle',
        icon: '✖️',
      },
    ],
  },
  {
    title: 'Special surfaces',
    description: 'Restricted announcements, post-close confirmation, dialogs, and fatal errors.',
    scenarios: [
      {
        id: 'announcement',
        title: 'Rare announcement',
        hint: 'Release-scoped ID demonstrates host suppression',
        icon: '📣',
      },
      {
        id: 'hud-after-close',
        title: 'Post-close HUD',
        hint: 'Closes the launcher and confirms completion',
        icon: '💬',
      },
      {
        id: 'confirmation-default',
        title: 'Default confirmation',
        hint: 'Confirm or cancel a normal decision',
        icon: '❓',
      },
      {
        id: 'confirmation-danger',
        title: 'Danger confirmation',
        hint: 'Destructive visual treatment',
        icon: '⚠️',
        danger: true,
      },
      {
        id: 'confirmation-concurrent',
        title: 'Concurrent confirmation',
        hint: 'Second request is rejected while one is open',
        icon: '2️⃣',
      },
    ],
  },
  {
    title: 'Background delivery',
    description: 'Feedback for delayed work when no Asyar window needs to remain visible.',
    scenarios: [
      {
        id: 'background-plain',
        title: 'Plain background result',
        hint: 'Sends title and body through the facade',
        icon: '🔔',
      },
      {
        id: 'background-actions',
        title: 'Background actions',
        hint: 'Adds Extend and Stop command actions',
        icon: '☕',
      },
      {
        id: 'background-dismiss',
        title: 'Dismiss last background result',
        hint: 'Uses the last returned feedback ID',
        icon: '🚫',
      },
    ],
  },
  {
    title: 'Fatal recovery',
    description: 'Run last: this deliberately exercises the unrecoverable failure path.',
    scenarios: [
      {
        id: 'fatal',
        title: 'Fatal failure',
        hint: 'Opens the fatal dialog and focuses Asyar',
        icon: '☠️',
        danger: true,
      },
    ],
  },
] as const;

export const FEEDBACK_SCENARIOS = FEEDBACK_SCENARIO_GROUPS.flatMap(({ scenarios }) => scenarios);
