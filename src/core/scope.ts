/** Reconcile scope by stable field ID, preserving reader choices on reorder. */
export function reconcileScope(selected: readonly string[], previous: readonly string[], next: readonly string[]): string[] {
    const chosen = new Set(selected), old = new Set(previous);
    const result = next.filter(id => chosen.has(id) || !old.has(id));
    return result.length ? result : next.slice(0, 1);
}
export function visibleFieldLimit(width: number): number {
    if (width < 320) return 1;
    if (width < 480) return 2;
    if (width < 680) return 3;
    return 5;
}
