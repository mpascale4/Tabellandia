import { DIGITS_INFO } from '../data/digitsData';

const TABLE_ICON_BY_WORLD_ID: Record<number, string> = Object.fromEntries(
  DIGITS_INFO.filter(d => d.digit >= 2).map(d => [d.digit, d.emoji])
);

export function getTableIcon(worldId: number): string {
  return TABLE_ICON_BY_WORLD_ID[worldId] ?? '🔢';
}

export function withTableIcon(worldId: number, label: string): string {
  const icon = getTableIcon(worldId);
  return label.trimEnd().endsWith(icon) ? label : `${label} ${icon}`;
}


