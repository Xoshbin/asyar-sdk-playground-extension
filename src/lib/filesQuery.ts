/**
 * Parse an optional JSON params string for `files.query(path, sql, params?)`.
 * Returns `undefined` for empty/whitespace-only input, or throws an Error
 * if the input is invalid JSON or not a JSON array.
 */
export function parseSqlParams(raw: string): unknown[] | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed: unknown = JSON.parse(trimmed);
  if (!Array.isArray(parsed)) {
    throw new Error('SQL params must be a JSON array (e.g. ["value", 1])');
  }
  return parsed;
}

/**
 * Format an unknown thrown value into a human-readable error message.
 */
export function formatErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
