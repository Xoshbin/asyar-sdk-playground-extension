import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  FEEDBACK_SCENARIOS,
  SDK_PLAYGROUND_RELEASE_URL,
  feedbackAnnouncementIdForRun,
} from './feedbackScenarios';
import manifest from '../../manifest.json';

function sourceFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = resolve(root, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(?:ts|svelte)$/.test(path) && !path.endsWith('.test.ts') ? [path] : [];
  });
}

describe('feedback scenario catalog', () => {
  it('targets the real release page with the permissions required to open it', () => {
    expect(SDK_PLAYGROUND_RELEASE_URL).toBe(
      'https://github.com/Xoshbin/asyar/releases/tag/v0.1.1-36',
    );
    expect(manifest.permissions).toEqual(
      expect.arrayContaining(['feedback:announce', 'shell:open-url']),
    );
  });

  it('keeps the simulated release stable within a run and fresh across runs', () => {
    expect(feedbackAnnouncementIdForRun('0.1.1-36', 'clickable-v1', 'run-a')).toBe(
      'sdk-playground-feedback-announcement-0.1.1-36-clickable-v1-run-a',
    );
    expect(feedbackAnnouncementIdForRun('0.1.1-36', 'clickable-v1', 'run-b')).not.toBe(
      feedbackAnnouncementIdForRun('0.1.1-36', 'clickable-v1', 'run-a'),
    );
  });

  it('covers every public feedback surface and lifecycle edge case', () => {
    expect(FEEDBACK_SCENARIOS.map(({ id }) => id)).toEqual([
      'bar-info',
      'bar-success',
      'bar-warning',
      'bar-error',
      'bar-error-details',
      'bar-long-message',
      'bar-deduplication',
      'bar-priority',
      'progress-indeterminate',
      'progress-determinate-success',
      'progress-failure',
      'progress-dismiss',
      'announcement',
      'hud-after-close',
      'confirmation-default',
      'confirmation-danger',
      'confirmation-concurrent',
      'background-plain',
      'background-actions',
      'background-dismiss',
      'fatal',
    ]);
  });

  it('gives every scenario unique identity and user-facing metadata', () => {
    const ids = new Set(FEEDBACK_SCENARIOS.map(({ id }) => id));
    expect(ids.size).toBe(FEEDBACK_SCENARIOS.length);
    expect(FEEDBACK_SCENARIOS.every(({ title, hint, icon }) => title && hint && icon)).toBe(true);
  });

  it('uses only the feedback facade for feedback production', () => {
    const srcRoot = resolve(__dirname, '..');
    const staleApi = /IDiagnosticsService|\('diagnostics'\)|showToast|hideToast/;
    const violations = sourceFiles(srcRoot).filter((path) =>
      staleApi.test(readFileSync(path, 'utf8')),
    );

    expect(violations).toEqual([]);
  });
});
