export type GreetStyle = 'casual' | 'formal' | 'rhyming';

export interface GreetArgs {
  name: string;
  style: GreetStyle;
  volume: number;
}

const STYLES: readonly GreetStyle[] = ['casual', 'formal', 'rhyming'];

export function parseGreetArgs(raw: Record<string, unknown>): GreetArgs {
  const name = typeof raw.name === 'string' && raw.name.length > 0 ? raw.name : 'stranger';
  const rawStyle = typeof raw.style === 'string' ? raw.style : 'casual';
  const style: GreetStyle = (STYLES as readonly string[]).includes(rawStyle)
    ? (rawStyle as GreetStyle)
    : 'casual';
  const rawVolume = Number(raw.volume ?? 1);
  const volume = Number.isFinite(rawVolume) ? Math.max(0, Math.floor(rawVolume)) : 1;
  return { name, style, volume };
}

export function buildGreeting({ name, style, volume }: GreetArgs): string {
  const punctuation = '!'.repeat(volume);
  switch (style) {
    case 'formal':
      return `Good day, ${name}${punctuation}`;
    case 'rhyming':
      return `Hey ${name}, you shine like a flame${punctuation}`;
    default:
      return `Hey ${name}${punctuation}`;
  }
}
