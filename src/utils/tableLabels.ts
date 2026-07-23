export const tableLabels = {};
export function getTableLabel(key: string): string {
  return key;
}
export function getTableIcon(tableNum: number): string {
  return '⭐';
}
export function withTableIcon(tableNum: number, label: string): string {
  return label;
}
