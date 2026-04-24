/**
 * Pure helper: append `entry` to `buf` and return a new array no longer than
 * `max`. Always drops from the LEFT (oldest first). Returns a fresh array so
 * callers reading a frozen state snapshot can feed it in directly.
 *
 * Used by the worker before every state write so that `state:changed` payloads
 * stay bounded — the tail slice happens ONCE in the writer, not in each reader.
 */
export function appendBounded<T>(buf: readonly T[], entry: T, max: number): T[] {
  if (max <= 0) return [];
  const next = [...buf, entry];
  if (next.length <= max) return next;
  return next.slice(next.length - max);
}
