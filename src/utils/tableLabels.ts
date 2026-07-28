const TABLE_ICON_BY_WORLD_ID: Record<number, string> = {
  2: '🐂',
  3: '👑',
  4: '🐈',
  5: '✋',
  6: '🐌',
  7: '🧙',
  8: '🛶',
  9: '🚢',
};

export function getTableIcon(worldId: number): string {
  return TABLE_ICON_BY_WORLD_ID[worldId] ?? '🔢';
}

export function withTableIcon(worldId: number, label: string): string {
  const icon = getTableIcon(worldId);
  return label.trimEnd().endsWith(icon) ? label : `${label} ${icon}`;
}


