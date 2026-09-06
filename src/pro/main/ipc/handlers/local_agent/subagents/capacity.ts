export function subagentCapacity(value?: number): number {
  return Number.isInteger(value) && value! >= 1 && value! <= 3 ? value! : 2;
}
export function activeSubagentCount(
  active: ReadonlyMap<number, ReadonlySet<string>>,
): number {
  return [...active.values()].reduce((total, runs) => total + runs.size, 0);
}
