export const OX_EMOJI = '🐂';

export function withOxIfSecond(worldId: number, label: string): string {
  return worldId === 2 ? `${label} ${OX_EMOJI}` : label;
}

