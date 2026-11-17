// Pure helpers for the monthly close (testable without the server).
export type FundLine = { id: string; name: string; percent: number };

/** Splits a positive amount by percentages; rounding remainder goes to the first fund so the sum is exact. */
export function allocate(netProfitCents: number, plan: FundLine[]): { name: string; cents: number }[] {
  if (netProfitCents <= 0 || plan.length === 0) return [];
  const lines = plan.map((f) => ({ name: f.name, cents: Math.floor((netProfitCents * f.percent) / 100) }));
  const totalPercent = plan.reduce((s, f) => s + f.percent, 0);
  if (Math.abs(totalPercent - 100) < 0.001) {
    const diff = netProfitCents - lines.reduce((s, l) => s + l.cents, 0);
    if (lines[0]) lines[0].cents += diff;
  }
  return lines;
}
