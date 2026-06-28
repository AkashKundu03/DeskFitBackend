// ─────────────────────────────────────────────────────────────────────────────
// Deterministic wellness "recovery signals" engine. Compares today against the
// user's own 14/28-day baseline. This is EDUCATIONAL guidance — never a medical
// diagnosis, never a "stress score", no emergency detection. If there isn't
// enough history, it honestly says "Learning your baseline".
// ─────────────────────────────────────────────────────────────────────────────

export interface DayMetrics {
  date: string;
  restingHR?: number | null;
  hrv?: number | null;
  sleepMinutes?: number | null;
  steps?: number | null;
  activeEnergyKcal?: number | null;
}

export interface CheckIn {
  energy?: number | null; // 1 (low) … 5 (high)
  soreness?: number | null; // 1 (none) … 5 (very sore)
  mood?: number | null; // 1 … 5
  stress?: number | null; // 1 (calm) … 5 (stressed)
}

export type InsightStatus = 'learning' | 'onTrack' | 'recoveryLower';

export interface Insight {
  status: InsightStatus;
  coverageDays: number;
  title: string;
  message: string;
  factors: string[];
  action: string;
  baseline: {
    restingHR: number | null;
    hrv: number | null;
    sleepMinutes: number | null;
  };
}

const MIN_COVERAGE = 7; // need at least a week of data to have a baseline

function mean(values: number[]): number | null {
  const v = values.filter((x) => Number.isFinite(x));
  if (v.length === 0) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

function take(history: DayMetrics[], days: number): DayMetrics[] {
  // Most-recent `days` excluding the current day (caller passes today separately).
  return history.slice(0, days);
}

export function computeInsight(
  history: DayMetrics[],
  today: DayMetrics | null,
  checkIn: CheckIn | null,
): Insight {
  // Use a 28-day window for the baseline; require 14-day depth ideally but accept
  // a 7-day minimum.
  const window = take(history, 28);
  const restingBaseline = mean(window.map((d) => d.restingHR ?? NaN).filter(Number.isFinite));
  const hrvBaseline = mean(window.map((d) => d.hrv ?? NaN).filter(Number.isFinite));
  const sleepBaseline = mean(window.map((d) => d.sleepMinutes ?? NaN).filter(Number.isFinite));

  const coverageDays = window.filter(
    (d) => d.restingHR != null || d.hrv != null || d.sleepMinutes != null,
  ).length;

  const baseline = {
    restingHR: restingBaseline,
    hrv: hrvBaseline,
    sleepMinutes: sleepBaseline,
  };

  if (coverageDays < MIN_COVERAGE) {
    return {
      status: 'learning',
      coverageDays,
      title: 'Learning your baseline',
      message:
        'DeskFit is still learning your normal patterns. After about a week of data, you’ll see personalized recovery signals here.',
      factors: [],
      action: 'Keep logging — your insights get sharper every day.',
      baseline,
    };
  }

  const factors: string[] = [];
  let negatives = 0;

  if (today?.restingHR != null && restingBaseline != null && today.restingHR > restingBaseline * 1.07) {
    factors.push('Resting heart rate is higher than your usual');
    negatives++;
  }
  if (today?.hrv != null && hrvBaseline != null && today.hrv < hrvBaseline * 0.85) {
    factors.push('Heart-rate variability is lower than your usual');
    negatives++;
  }
  if (today?.sleepMinutes != null && sleepBaseline != null && today.sleepMinutes < sleepBaseline * 0.8) {
    factors.push('You slept less than your usual');
    negatives++;
  }
  if (checkIn?.energy != null && checkIn.energy <= 2) {
    factors.push('You reported low energy');
    negatives++;
  }
  if (checkIn?.soreness != null && checkIn.soreness >= 4) {
    factors.push('You reported high soreness');
    negatives++;
  }
  if (checkIn?.stress != null && checkIn.stress >= 4) {
    factors.push('You reported feeling stressed');
    negatives++;
  }

  if (negatives >= 2) {
    return {
      status: 'recoveryLower',
      coverageDays,
      title: 'Recovery signals are lower than usual',
      message:
        'A few of your signals differ from your normal today. This isn’t a diagnosis — just a nudge to listen to your body.',
      factors,
      action: 'Consider an easier session, a shorter workout, or extra recovery today.',
      baseline,
    };
  }

  return {
    status: 'onTrack',
    coverageDays,
    title: 'You’re recovering well',
    message: 'Your signals look in line with your usual. A normal session looks good today.',
    factors,
    action: 'Go for your planned workout — you’re in a good spot.',
    baseline,
  };
}
