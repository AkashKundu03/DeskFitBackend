import { computeInsight, type DayMetrics } from './health-insight';

function history(days: number, base: Partial<DayMetrics> = {}): DayMetrics[] {
  return Array.from({ length: days }, (_, i) => ({
    date: `2026-06-${String(28 - i).padStart(2, '0')}`,
    restingHR: base.restingHR ?? 58,
    hrv: base.hrv ?? 60,
    sleepMinutes: base.sleepMinutes ?? 420,
  }));
}

describe('computeInsight', () => {
  it('returns "learning" until there is at least a week of data', () => {
    const res = computeInsight(history(4), null, null);
    expect(res.status).toBe('learning');
    expect(res.coverageDays).toBe(4);
    expect(res.factors).toHaveLength(0);
  });

  it('reports on-track when today matches the baseline', () => {
    const res = computeInsight(history(20), { date: 'today', restingHR: 58, hrv: 60, sleepMinutes: 420 }, null);
    expect(res.status).toBe('onTrack');
    expect(res.baseline.restingHR).toBeCloseTo(58, 0);
  });

  it('flags recoveryLower when multiple sensor signals deviate', () => {
    const today: DayMetrics = { date: 'today', restingHR: 66, hrv: 45, sleepMinutes: 300 };
    const res = computeInsight(history(20), today, null);
    expect(res.status).toBe('recoveryLower');
    expect(res.factors.length).toBeGreaterThanOrEqual(2);
    expect(res.title.toLowerCase()).not.toContain('stress score'); // never a diagnosis
  });

  it('does not flag on a single mild deviation', () => {
    const today: DayMetrics = { date: 'today', restingHR: 63, hrv: 60, sleepMinutes: 420 };
    const res = computeInsight(history(20), today, null);
    expect(res.status).toBe('onTrack');
  });

  it('factors in subjective check-ins', () => {
    const today: DayMetrics = { date: 'today', restingHR: 66, hrv: 60, sleepMinutes: 420 };
    const res = computeInsight(history(20), today, { energy: 2, soreness: 4 });
    expect(res.status).toBe('recoveryLower');
    expect(res.factors).toContain('You reported low energy');
    expect(res.factors).toContain('You reported high soreness');
  });

  it('computes baselines from up to 28 days', () => {
    const res = computeInsight(history(40, { restingHR: 50 }), null, null);
    expect(res.baseline.restingHR).toBeCloseTo(50, 0);
  });
});
