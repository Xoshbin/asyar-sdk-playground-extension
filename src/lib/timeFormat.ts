export function formatTime(input: Date | number): string {
  const d = typeof input === 'number' ? new Date(input) : input;
  return d.toLocaleTimeString(undefined, {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
