// ─────────────────────────────────────────────────────────────────────────────
// seed-demo.mjs — populate a DeskFit database with realistic DEMO users by
// driving the REAL HTTP API (so every plan/meal/insight is produced by the
// actual deterministic engines, not hand-faked rows).
//
// Usage (LOCAL only — never point this at production):
//   API=http://localhost:3000 node scripts/seed-demo.mjs
//
// Each user is created with a known email/password so you can log in via the
// app's dev sign-in and see a fully-populated account.
//   email:    demo+<slug>@deskfit.test
//   password: DeskFit#2026
//
// Safe to re-run: emails that already exist are skipped (signup 409 → login).
// ─────────────────────────────────────────────────────────────────────────────

const API = process.env.API || 'http://localhost:3000';
const PASSWORD = 'DeskFit#2026';
const HISTORY_DAYS = 21; // days of health history per user (enough for baselines)
const CHECKIN_DAYS = 6; // most-recent days that also get a subjective check-in

// ── tiny fetch helper ────────────────────────────────────────────────────────
async function api(method, path, { token, body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  return { status: res.status, ok: res.ok, json };
}

// ── date + number helpers (plain Node — Date/Math.random are fine here) ──────
const pad = (n) => String(n).padStart(2, '0');
function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const rint = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const jitter = (base, spread) => Math.max(0, Math.round(base + (Math.random() * 2 - 1) * spread));

// ── derive a health report from body metrics (Mifflin-St Jeor) ───────────────
const ACTIVITY_FACTOR = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, athlete: 1.9 };
function deriveReport(p) {
  const h = p.heightCm, w = p.weightKg, a = p.age;
  const bmi = +(w / ((h / 100) ** 2)).toFixed(1);
  const bmr = Math.round(10 * w + 6.25 * h - 5 * a + (p.gender === 'female' ? -161 : 5));
  const tdee = Math.round(bmr * (ACTIVITY_FACTOR[p.activity] ?? 1.55));
  const goalDelta = p.goal === 'fatLoss' ? -400 : p.goal === 'muscleGain' ? 250 : 0;
  const dailyKcal = Math.max(1200, tdee + goalDelta);
  const proteinG = Math.round(w * (p.goal === 'muscleGain' ? 1.9 : 1.6));
  const fatG = Math.round((dailyKcal * 0.25) / 9);
  const carbsG = Math.max(0, Math.round((dailyKcal - proteinG * 4 - fatG * 9) / 4));
  const fiberG = 30;
  const bmiCategory = bmi < 18.5 ? 'underweight' : bmi < 25 ? 'normal' : bmi < 30 ? 'overweight' : 'obese';
  return {
    dailyKcal, proteinG, carbsG, fatG, fiberG,
    report: {
      bmi, bmiCategory, bmr, tdee,
      healthyWeightMin: Math.round(18.5 * (h / 100) ** 2),
      healthyWeightMax: Math.round(24.9 * (h / 100) ** 2),
      targetCaloriesMin: dailyKcal - 100,
      targetCaloriesMax: dailyKcal + 100,
      gutHealthScore: +(6 + Math.random() * 3).toFixed(1),
      educationalGutAge: a + rint(-3, 6),
      priorityActions: ['hydration', 'fiber', 'sleep_consistency'].slice(0, rint(1, 3)),
      riskSignals: [],
    },
  };
}

// ── equipment presets by location ────────────────────────────────────────────
const EQUIP = {
  gym: ['dumbbells', 'barbell', 'bench', 'cable', 'machine'],
  home: ['bodyweight', 'dumbbells', 'resistanceBand'],
  outdoor: ['bodyweight', 'jumpRope'],
  office: ['bodyweight', 'resistanceBand'],
  mixed: ['bodyweight', 'dumbbells', 'kettlebell'],
};

// ── 24 realistic personas ────────────────────────────────────────────────────
const P = (name, gender, age, heightCm, weightKg, targetWeightKg, activity, goal, level, location, days, durationMin, diet, mealCount, tz, extra = {}) =>
  ({ name, gender, age, heightCm, weightKg, targetWeightKg, activity, goal, level, location, days, durationMin, diet, mealCount, tz, ...extra });

const PERSONAS = [
  P('Aarav Sharma', 'male', 28, 175, 82, 74, 'moderate', 'fatLoss', 'intermediate', 'gym', ['Mon', 'Wed', 'Fri', 'Sat'], 45, 'vegetarian', 3, 'Asia/Kolkata', { proteinPrefs: ['paneer', 'dal', 'whey'], carbPrefs: ['rice', 'roti'], includeSnack: true }),
  P('Priya Nair', 'female', 31, 162, 68, 60, 'light', 'fatLoss', 'beginner', 'home', ['Tue', 'Thu', 'Sat'], 30, 'vegetarian', 3, 'Asia/Kolkata', { proteinPrefs: ['paneer', 'dal'], carbPrefs: ['roti', 'oats'], includeSnack: true }),
  P('Rohan Mehta', 'male', 24, 180, 70, 78, 'active', 'muscleGain', 'intermediate', 'gym', ['Mon', 'Tue', 'Thu', 'Fri'], 60, 'nonVegetarian', 4, 'Asia/Kolkata', { proteinPrefs: ['chicken', 'eggs', 'whey'], carbPrefs: ['rice', 'potato'], includeSnack: true }),
  P('Sneha Reddy', 'female', 27, 158, 55, 55, 'moderate', 'maintenance', 'intermediate', 'home', ['Mon', 'Wed', 'Fri'], 30, 'eggitarian', 3, 'Asia/Kolkata', { proteinPrefs: ['eggs', 'paneer'], carbPrefs: ['rice', 'roti'] }),
  P('Vikram Singh', 'male', 35, 178, 95, 82, 'sedentary', 'fatLoss', 'beginner', 'gym', ['Mon', 'Wed', 'Fri'], 45, 'nonVegetarian', 3, 'Asia/Kolkata', { proteinPrefs: ['chicken', 'fish'], carbPrefs: ['roti', 'rice'], allergens: ['none'] }),
  P('Ananya Iyer', 'female', 29, 165, 72, 63, 'light', 'fatLoss', 'beginner', 'office', ['Tue', 'Thu'], 20, 'vegan', 3, 'Asia/Kolkata', { proteinPrefs: ['tofu', 'dal'], carbPrefs: ['quinoa', 'oats'], allergens: ['lactose'] }),
  P('Karthik Rao', 'male', 40, 172, 88, 80, 'moderate', 'fatLoss', 'intermediate', 'gym', ['Mon', 'Tue', 'Thu', 'Sat'], 45, 'nonVegetarian', 4, 'Asia/Kolkata', { proteinPrefs: ['chicken', 'eggs'], carbPrefs: ['rice', 'potato'] }),
  P('Meera Joshi', 'female', 33, 160, 64, 58, 'moderate', 'maintenance', 'intermediate', 'mixed', ['Mon', 'Wed', 'Fri', 'Sun'], 30, 'vegetarian', 3, 'Asia/Kolkata', { proteinPrefs: ['paneer', 'dal'], carbPrefs: ['roti', 'oats'], includeSnack: true }),
  P('Arjun Kapoor', 'male', 22, 183, 68, 76, 'active', 'muscleGain', 'beginner', 'gym', ['Mon', 'Tue', 'Wed', 'Fri', 'Sat'], 60, 'eggitarian', 4, 'Asia/Kolkata', { proteinPrefs: ['eggs', 'whey', 'paneer'], carbPrefs: ['rice', 'potato'], includeSnack: true }),
  P('Divya Menon', 'female', 26, 167, 59, 57, 'active', 'muscleGain', 'intermediate', 'gym', ['Tue', 'Thu', 'Sat'], 45, 'nonVegetarian', 4, 'Asia/Kolkata', { proteinPrefs: ['fish', 'chicken', 'whey'], carbPrefs: ['rice', 'quinoa'] }),
  P('Sameer Khan', 'male', 38, 176, 90, 80, 'light', 'fatLoss', 'beginner', 'home', ['Mon', 'Wed', 'Fri'], 30, 'nonVegetarian', 3, 'Asia/Kolkata', { proteinPrefs: ['chicken', 'eggs'], carbPrefs: ['roti', 'rice'] }),
  P('Ishita Ghosh', 'female', 30, 163, 70, 61, 'sedentary', 'fatLoss', 'beginner', 'office', ['Tue', 'Thu'], 15, 'vegetarian', 3, 'Asia/Kolkata', { proteinPrefs: ['paneer', 'dal'], carbPrefs: ['roti', 'oats'], includeSnack: true }),
  P('Nikhil Verma', 'male', 45, 170, 85, 78, 'moderate', 'maintenance', 'intermediate', 'gym', ['Mon', 'Wed', 'Fri'], 45, 'nonVegetarian', 3, 'Asia/Kolkata', { proteinPrefs: ['chicken', 'fish'], carbPrefs: ['rice', 'roti'] }),
  P('Tara DSouza', 'female', 25, 170, 62, 60, 'active', 'muscleGain', 'intermediate', 'gym', ['Mon', 'Tue', 'Thu', 'Fri'], 60, 'nonVegetarian', 4, 'Asia/Kolkata', { proteinPrefs: ['chicken', 'whey', 'eggs'], carbPrefs: ['rice', 'potato'], includeSnack: true }),
  P('Aditya Bose', 'male', 32, 181, 79, 79, 'moderate', 'maintenance', 'intermediate', 'mixed', ['Mon', 'Wed', 'Fri', 'Sat'], 45, 'eggitarian', 3, 'Asia/Kolkata', { proteinPrefs: ['eggs', 'paneer', 'dal'], carbPrefs: ['rice', 'roti'] }),
  P('Kavya Pillai', 'female', 28, 159, 66, 58, 'light', 'fatLoss', 'beginner', 'home', ['Tue', 'Thu', 'Sat'], 30, 'vegan', 3, 'Asia/Kolkata', { proteinPrefs: ['tofu', 'dal'], carbPrefs: ['oats', 'quinoa'], allergens: ['lactose'] }),
  P('Rahul Gupta', 'male', 29, 174, 73, 78, 'active', 'muscleGain', 'intermediate', 'gym', ['Mon', 'Tue', 'Thu', 'Fri', 'Sat'], 60, 'vegetarian', 4, 'Asia/Kolkata', { proteinPrefs: ['paneer', 'whey', 'dal'], carbPrefs: ['rice', 'potato'], includeSnack: true }),
  P('Pooja Agarwal', 'female', 34, 161, 74, 64, 'sedentary', 'fatLoss', 'beginner', 'office', ['Mon', 'Wed'], 20, 'vegetarian', 3, 'Asia/Kolkata', { proteinPrefs: ['paneer', 'dal'], carbPrefs: ['roti', 'oats'] }),
  P('Daniel Fernandez', 'male', 36, 179, 84, 77, 'moderate', 'fatLoss', 'intermediate', 'gym', ['Mon', 'Wed', 'Fri', 'Sun'], 45, 'nonVegetarian', 3, 'Europe/Lisbon', { proteinPrefs: ['chicken', 'fish'], carbPrefs: ['rice', 'potato'] }),
  P('Emily Carter', 'female', 27, 168, 63, 60, 'active', 'maintenance', 'intermediate', 'home', ['Mon', 'Tue', 'Thu', 'Sat'], 30, 'mixed', 3, 'America/New_York', { proteinPrefs: ['chicken', 'eggs', 'whey'], carbPrefs: ['oats', 'rice'], includeSnack: true }),
  P('Mohammed Ali', 'male', 41, 173, 92, 82, 'light', 'fatLoss', 'beginner', 'home', ['Tue', 'Thu', 'Sat'], 30, 'nonVegetarian', 3, 'Asia/Dubai', { proteinPrefs: ['chicken', 'fish'], carbPrefs: ['rice', 'roti'] }),
  P('Lakshmi Sundaram', 'female', 52, 156, 68, 62, 'light', 'maintenance', 'beginner', 'home', ['Mon', 'Wed', 'Fri'], 20, 'vegetarian', 3, 'Asia/Kolkata', { proteinPrefs: ['paneer', 'dal'], carbPrefs: ['rice', 'roti'] }),
  P('Sanjay Patel', 'male', 48, 168, 80, 75, 'sedentary', 'fatLoss', 'beginner', 'office', ['Mon', 'Thu'], 15, 'vegetarian', 3, 'Asia/Kolkata', { proteinPrefs: ['paneer', 'dal'], carbPrefs: ['roti', 'oats'], includeSnack: true }),
  P('Zara Sheikh', 'female', 23, 164, 57, 60, 'active', 'muscleGain', 'beginner', 'gym', ['Mon', 'Wed', 'Fri'], 45, 'eggitarian', 4, 'Asia/Karachi', { proteinPrefs: ['eggs', 'paneer', 'whey'], carbPrefs: ['rice', 'potato'], includeSnack: true }),
];

const slugify = (name) => name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');

async function seedUser(p) {
  const email = `demo+${slugify(p.name)}@deskfit.test`;
  const label = p.name.padEnd(20);

  // 1) signup (or login if already seeded)
  let token;
  const signup = await api('POST', '/auth/signup', { body: { email, password: PASSWORD } });
  if (signup.ok) {
    token = signup.json.accessToken;
  } else {
    const login = await api('POST', '/auth/login', { body: { email, password: PASSWORD } });
    if (!login.ok) return { email, ok: false, step: 'auth', detail: signup.json };
    token = login.json.accessToken;
  }

  const d = deriveReport(p);

  // 2) assessment (profile + gut answers + derived report)
  const assess = await api('PUT', '/me/assessment', {
    token,
    body: {
      profile: {
        name: p.name, age: p.age, gender: p.gender,
        heightCm: p.heightCm, weightKg: p.weightKg, targetWeightKg: p.targetWeightKg,
        activityLevel: p.activity, goal: p.goal, medicalFlags: {},
      },
      gutAnswers: {
        bowelFrequency: ['daily', 'twiceDaily', 'everyOtherDay'][rint(0, 2)],
        stoolConsistency: 'normal',
        bloatingFrequency: ['never', 'rarely', 'sometimes'][rint(0, 2)],
        waterIntake: +(2 + Math.random() * 1.5).toFixed(1),
        sleepHours: +(6 + Math.random() * 2).toFixed(1),
      },
      report: d.report,
    },
  });
  if (!assess.ok) return { email, ok: false, step: 'assessment', detail: assess.json };

  // 3) weekly workout plan (real generator)
  const workout = await api('POST', '/workouts/weekly-plan', {
    token,
    body: {
      selectedDays: p.days,
      location: p.location,
      durationMin: p.durationMin,
      equipment: EQUIP[p.location] ?? EQUIP.home,
      level: p.level,
      goal: p.goal,
    },
  });
  if (!workout.ok) return { email, ok: false, step: 'workout', detail: workout.json };

  // 4) weekly meal template (real generator, repeating weekly)
  const meals = await api('POST', '/nutrition/weekly/plan', {
    token,
    body: {
      mealCount: p.mealCount,
      includeSnack: !!p.includeSnack,
      dietaryPref: p.diet,
      proteinPrefs: p.proteinPrefs ?? [],
      carbPrefs: p.carbPrefs ?? [],
      fiberPrefs: ['vegetables', 'fruits'],
      allergens: p.allergens ?? ['none'],
      dislikes: [],
      dailyKcal: d.dailyKcal,
      proteinG: d.proteinG,
      carbsG: d.carbsG,
      fatG: d.fatG,
      fiberG: d.fiberG,
    },
  });
  if (!meals.ok) return { email, ok: false, step: 'meals', detail: meals.json };

  // 5) ~21 days of health history + recent check-ins (feeds the insight engine)
  let dailyOk = 0, checkinOk = 0;
  for (let i = 0; i < HISTORY_DAYS; i++) {
    const date = isoDaysAgo(i);
    const trained = p.days.length >= 4 ? (i % 2 === 0) : (i % 3 === 0);
    const daily = await api('PUT', '/me/health/daily', {
      token,
      body: {
        date, timezone: p.tz,
        steps: jitter(7500, 3000),
        activeEnergyKcal: jitter(420, 150),
        exerciseMinutes: trained ? jitter(p.durationMin, 10) : jitter(10, 8),
        sleepMinutes: jitter(420, 45),
        restingHR: jitter(p.age > 40 ? 66 : 60, 5),
        hrv: +(jitter(48, 10)).toFixed(1),
        workoutCount: trained ? 1 : 0,
        workoutMinutes: trained ? jitter(p.durationMin, 8) : 0,
        sourceCoverage: { 'Apple Watch': true, iPhone: true },
      },
    });
    if (daily.ok) dailyOk++;
    if (i < CHECKIN_DAYS) {
      const checkin = await api('PUT', '/me/health/checkin', {
        token,
        body: { date, energy: rint(2, 5), soreness: rint(1, 4), mood: rint(2, 5), stress: rint(1, 4) },
      });
      if (checkin.ok) checkinOk++;
    }
  }

  return { email, ok: true, label: p.name, dailyOk, checkinOk };
}

// ── run ──────────────────────────────────────────────────────────────────────
console.log(`\nSeeding ${PERSONAS.length} demo users → ${API}\n`);
const health = await api('GET', '/health');
if (!health.ok) {
  console.error(`✗ API not reachable at ${API}. Start it with:  npm run start:dev`);
  process.exit(1);
}

const results = [];
for (const p of PERSONAS) {
  const r = await seedUser(p);
  results.push(r);
  if (r.ok) {
    console.log(`  ✓ ${r.label.padEnd(20)} ${r.email}  (${r.dailyOk} days, ${r.checkinOk} check-ins)`);
  } else {
    console.log(`  ✗ ${(r.label ?? r.email).padEnd(20)} failed at ${r.step}: ${JSON.stringify(r.detail).slice(0, 160)}`);
  }
}

const ok = results.filter((r) => r.ok).length;
console.log(`\nDone. ${ok}/${results.length} users fully seeded.`);
console.log(`Login for any of them → password: ${PASSWORD}\n`);
