export const BURNOUT_DELTAS = {
  baseline: 3,                 // applied every trimester regardless
  runwayCritical: 8,           // when runwayMonths < 3 at trimester close
  firedSomeone: 4,             // any team.fire action this trimester
  successfulRaise: -6,         // any finance.raiseFunds applied this trimester
  shippedProduct: -4,          // product.launch applied this trimester
} as const;

export function applyBurnoutDelta(current: number, delta: number): number {
  const next = current + delta;
  if (next < 0) return 0;
  if (next > 100) return 100;
  return next;
}
