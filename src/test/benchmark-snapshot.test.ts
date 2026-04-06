import { describe, expect, it } from 'vitest';
import { BENCHMARK_CASES } from '@/lib/benchmark/catalog';
import { runBenchmarkSnapshot } from '@/lib/benchmark/metrics';

describe('benchmark snapshot', () => {
  it('aggregates suite metrics for a subset of benchmark cases', async () => {
    const subset = BENCHMARK_CASES.filter((item) => ['tp-2', 'tp-9', 'tp-22'].includes(item.id));
    const snapshot = await runBenchmarkSnapshot(subset);

    expect(snapshot.total_cases).toBe(3);
    expect(snapshot.case_runs).toHaveLength(3);
    expect(snapshot.suite_summaries.length).toBeGreaterThanOrEqual(2);
    expect(snapshot.pass_rate).toBeGreaterThan(0.9);
  });
});
