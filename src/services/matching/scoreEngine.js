/**
 * Pure Roommate Compatibility Scoring Engine
 * 
 * DESIGN PRINCIPLES:
 * 1. PURE FUNCTION: Zero external database dependencies, no Mongoose, no path-aliases.
 *    Easy to unit test, debug, and explain in an academic viva.
 * 2. DETERMINISTIC & SYMMETRIC: calculateCompatibility(a, b) === calculateCompatibility(b, a).
 * 3. FAIRNESS RULE: Matching relies strictly on voluntary lifestyle habits.
 *    Nationality, home country, state, or ethnicity are NEVER referenced.
 * 4. PRIVACY: Produces aggregate compatibility scores, category breakdowns, and friendly
 *    reasons without leaking raw student answers.
 */

import {
  ENGINE_VERSION,
  DEFAULT_WEIGHTS,
  YEAR_BONUS,
  getScoreLabel,
  SLEEP_SIMILARITY,
  STUDY_SIMILARITY,
  FOOD_SIMILARITY_PAIRS,
  NIGHT_CALLS_SIMILARITY,
  CATEGORY_LABELS,
} from "../../config/matching.js";

/**
 * Normalizes input object to retrieve preference fields.
 * Accepts either { preferences: { ... } } or a flattened preference object.
 * 
 * @param {object} student 
 * @returns {object}
 */
function getPreferences(student) {
  if (!student) return {};
  return student.preferences || student;
}

/**
 * Extracts and sorts shared languages between two students.
 * Case-insensitive comparison; returns properly capitalized string array.
 * 
 * @param {string[]} langsA 
 * @param {string[]} langsB 
 * @returns {string[]}
 */
export function getSharedLanguages(langsA = [], langsB = []) {
  if (!Array.isArray(langsA) || !Array.isArray(langsB)) return [];
  const setB = new Set(langsB.map((l) => (l || "").trim().toLowerCase()));
  const shared = [];
  const seen = new Set();

  for (const lang of langsA) {
    const clean = (lang || "").trim();
    const lower = clean.toLowerCase();
    if (lower && setB.has(lower) && !seen.has(lower)) {
      seen.add(lower);
      // Format with initial capitalization
      shared.push(clean.charAt(0).toUpperCase() + clean.slice(1));
    }
  }

  return shared.sort((a, b) => a.localeCompare(b));
}

/**
 * Checks mutual deal-breakers between two students.
 * If either student's deal-breaker is violated by the other, the pair is excluded.
 * 
 * @param {object} a - Student A object
 * @param {object} b - Student B object
 * @returns {{ excluded: boolean, violations: Array<{ by: "A" | "B", key: string }> }}
 */
export function checkDealBreakers(a, b) {
  const prefA = getPreferences(a);
  const prefB = getPreferences(b);
  const violations = [];

  const dealBreakersA = Array.isArray(prefA.dealBreakers) ? prefA.dealBreakers : [];
  const dealBreakersB = Array.isArray(prefB.dealBreakers) ? prefB.dealBreakers : [];

  // 1. Check violations committed by B against A's deal-breakers
  for (const key of dealBreakersA) {
    if (key === "food") {
      if (prefA.foodType && prefB.foodType && prefB.foodType !== prefA.foodType) {
        violations.push({ by: "B", key: "food" });
      }
    } else if (key === "lateNightNoise") {
      if (prefB.nightCalls === "often") {
        violations.push({ by: "B", key: "lateNightNoise" });
      }
    } else if (key === "visitors") {
      if (typeof prefB.socialLevel === "number" && prefB.socialLevel >= 4) {
        violations.push({ by: "B", key: "visitors" });
      }
    } else if (key === "cleanliness") {
      if (typeof prefB.cleanliness === "number" && prefB.cleanliness < 3) {
        violations.push({ by: "B", key: "cleanliness" });
      }
    } else if (key === "acType") {
      if (
        prefA.acPreference &&
        prefB.acPreference &&
        prefA.acPreference !== "no-preference" &&
        prefB.acPreference !== "no-preference" &&
        prefA.acPreference !== prefB.acPreference
      ) {
        violations.push({ by: "B", key: "acType" });
      }
    }
  }

  // 2. Check violations committed by A against B's deal-breakers (MUTUAL)
  for (const key of dealBreakersB) {
    if (key === "food") {
      if (prefB.foodType && prefA.foodType && prefA.foodType !== prefB.foodType) {
        violations.push({ by: "A", key: "food" });
      }
    } else if (key === "lateNightNoise") {
      if (prefA.nightCalls === "often") {
        violations.push({ by: "A", key: "lateNightNoise" });
      }
    } else if (key === "visitors") {
      if (typeof prefA.socialLevel === "number" && prefA.socialLevel >= 4) {
        violations.push({ by: "A", key: "visitors" });
      }
    } else if (key === "cleanliness") {
      if (typeof prefA.cleanliness === "number" && prefA.cleanliness < 3) {
        violations.push({ by: "A", key: "cleanliness" });
      }
    } else if (key === "acType") {
      if (
        prefB.acPreference &&
        prefA.acPreference &&
        prefB.acPreference !== "no-preference" &&
        prefA.acPreference !== "no-preference" &&
        prefB.acPreference !== prefA.acPreference
      ) {
        violations.push({ by: "A", key: "acType" });
      }
    }
  }

  return {
    excluded: violations.length > 0,
    violations,
  };
}

/**
 * Calculates dietary similarity between two students according to rules:
 * - same = 1.0
 * - specific pairs (veg/jain=0.7, veg/eggetarian=0.7, non-veg/eggetarian=0.7, non-veg/halal=0.8)
 * - every other different pair = 0 base in table, BUT then apply okWithDifferentFood rule:
 *     both okay with different food = 0.6
 *     only one okay = 0.3
 *     neither okay = 0.0
 * 
 * @param {object} prefA 
 * @param {object} prefB 
 * @returns {number} 0.0 to 1.0
 */
export function calculateFoodSimilarity(prefA, prefB) {
  const fA = prefA.foodType;
  const fB = prefB.foodType;

  if (!fA || !fB) return 0.5;
  if (fA === fB) return 1.0;

  // Check specific table pairs
  const pairKey = `${fA}:${fB}`;
  const tableVal = FOOD_SIMILARITY_PAIRS[pairKey] || 0.0;

  // Apply okWithDifferentFood rule
  let okVal = 0.0;
  const okA = Boolean(prefA.okWithDifferentFood);
  const okB = Boolean(prefB.okWithDifferentFood);

  if (okA && okB) {
    okVal = 0.6;
  } else if (okA || okB) {
    okVal = 0.3;
  }

  return Math.max(tableVal, okVal);
}

/**
 * Calculates academic year bonus points.
 * - same year: 5 points
 * - one year apart: 2 points
 * - otherwise: 0 points
 * 
 * @param {number|null} yearA 
 * @param {number|null} yearB 
 * @param {object} [yearBonusConfig=YEAR_BONUS] 
 * @returns {number}
 */
export function calculateYearBonus(yearA, yearB, yearBonusConfig = YEAR_BONUS) {
  if (typeof yearA !== "number" || typeof yearB !== "number") return 0;
  const diff = Math.abs(yearA - yearB);
  if (diff === 0) return yearBonusConfig.sameYear ?? 5;
  if (diff === 1) return yearBonusConfig.oneYearApart ?? 2;
  return yearBonusConfig.otherwise ?? 0;
}

/**
 * Main Pure Scoring Function.
 * Computes compatibility score, category breakdown, friendly reasons, and warnings.
 * Strictly symmetric: calculateCompatibility(a, b) === calculateCompatibility(b, a).
 * 
 * @param {object} a - Student A data
 * @param {object} b - Student B data
 * @param {object} [weights=DEFAULT_WEIGHTS] - Category weights (must sum to 100)
 * @param {object} [options={}] - Options (e.g. custom yearBonus)
 * @returns {object}
 */
export function calculateCompatibility(a, b, weights = DEFAULT_WEIGHTS, options = {}) {
  // 1. Evaluate mutual deal-breakers first
  const dealBreakerResult = checkDealBreakers(a, b);
  if (dealBreakerResult.excluded) {
    return {
      excluded: true,
      violations: dealBreakerResult.violations,
      score: 0,
      baseScore: 0,
      yearBonus: 0,
      label: getScoreLabel(0),
      breakdown: [],
      sharedLanguages: getSharedLanguages(
        getPreferences(a).languages,
        getPreferences(b).languages
      ),
      reasons: [],
      warnings: ["Pair excluded due to conflicting non-negotiable deal-breaker criteria."],
      engineVersion: ENGINE_VERSION,
    };
  }

  const prefA = getPreferences(a);
  const prefB = getPreferences(b);
  const activeWeights = { ...DEFAULT_WEIGHTS, ...weights };
  const yearBonusConfig = options.yearBonus || YEAR_BONUS;

  // 2. Sleep Schedule Similarity (20%)
  const sleepSim =
    (prefA.sleepSchedule && prefB.sleepSchedule
      ? SLEEP_SIMILARITY[prefA.sleepSchedule]?.[prefB.sleepSchedule]
      : null) ?? (prefA.sleepSchedule === prefB.sleepSchedule ? 1.0 : 0.5);

  // 3. Study Time Similarity (20%)
  const studySim =
    (prefA.studyTime && prefB.studyTime
      ? STUDY_SIMILARITY[prefA.studyTime]?.[prefB.studyTime]
      : null) ?? (prefA.studyTime === prefB.studyTime ? 1.0 : 0.5);

  // 4. Cleanliness Rating Similarity (15%) - 1 to 5 scale
  const cleanA = typeof prefA.cleanliness === "number" ? prefA.cleanliness : 3;
  const cleanB = typeof prefB.cleanliness === "number" ? prefB.cleanliness : 3;
  const cleanSim = Math.max(0, Math.min(1, 1 - Math.abs(cleanA - cleanB) / 4));

  // 5. Noise Tolerance Similarity (15%) - 1 to 5 scale
  const noiseA = typeof prefA.noiseTolerance === "number" ? prefA.noiseTolerance : 3;
  const noiseB = typeof prefB.noiseTolerance === "number" ? prefB.noiseTolerance : 3;
  const noiseSim = Math.max(0, Math.min(1, 1 - Math.abs(noiseA - noiseB) / 4));

  // 6. Food & Dietary Similarity (10%)
  const foodSim = calculateFoodSimilarity(prefA, prefB);

  // 7. Social / Visitor Comfort (10%) - 1 to 5 scale
  const socialA = typeof prefA.socialLevel === "number" ? prefA.socialLevel : 3;
  const socialB = typeof prefB.socialLevel === "number" ? prefB.socialLevel : 3;
  const socialSim = Math.max(0, Math.min(1, 1 - Math.abs(socialA - socialB) / 4));

  // 8. Language & Night Calls (10%)
  // 60% from shared languages (>=1 shared = 1.0, none = 0.0), 40% from nightCalls similarity
  const sharedLanguages = getSharedLanguages(prefA.languages, prefB.languages);
  const langSim = sharedLanguages.length > 0 ? 1.0 : 0.0;
  const callSim =
    (prefA.nightCalls && prefB.nightCalls
      ? NIGHT_CALLS_SIMILARITY[prefA.nightCalls]?.[prefB.nightCalls]
      : null) ?? (prefA.nightCalls === prefB.nightCalls ? 1.0 : 0.5);
  const langCallsSim = Math.max(0, Math.min(1, 0.6 * langSim + 0.4 * callSim));

  // Category map for breakdown
  const categorySims = [
    { key: "sleepSchedule", sim: sleepSim },
    { key: "studyTime", sim: studySim },
    { key: "cleanliness", sim: cleanSim },
    { key: "noiseTolerance", sim: noiseSim },
    { key: "foodType", sim: foodSim },
    { key: "socialLevel", sim: socialSim },
    { key: "languageAndCalls", sim: langCallsSim },
  ];

  let rawWeightedSum = 0;
  const breakdown = categorySims.map(({ key, sim }) => {
    const weight = activeWeights[key] || 0;
    const points = sim * weight;
    rawWeightedSum += points;
    return {
      key,
      label: CATEGORY_LABELS[key] || key,
      weight,
      similarity: Math.round(sim * 100) / 100,
      points: Math.round(points * 10) / 10,
      percent: Math.round(sim * 100),
    };
  });

  const baseScore = Math.round(rawWeightedSum);
  const yearBonus = calculateYearBonus(a.year, b.year, yearBonusConfig);
  const finalScore = Math.min(100, Math.max(0, Math.round(baseScore + yearBonus)));

  // Generate Friendly Reasons (Symmetric)
  const reasons = [];
  if (prefA.sleepSchedule && prefB.sleepSchedule && sleepSim >= 0.75) {
    if (prefA.sleepSchedule === prefB.sleepSchedule) {
      reasons.push(`Matching sleep schedule (both ${prefA.sleepSchedule} sleepers)`);
    } else {
      reasons.push("Compatible sleep routines");
    }
  }

  if (prefA.studyTime && prefB.studyTime && studySim >= 0.75) {
    if (prefA.studyTime === prefB.studyTime) {
      reasons.push(
        prefA.studyTime === "flexible"
          ? "Both have adaptable, flexible study schedules"
          : `Both prefer studying during ${prefA.studyTime}`
      );
    } else {
      reasons.push("Complementary study schedules");
    }
  }

  if (cleanSim >= 0.75) {
    reasons.push("Similar room cleanliness and organization habits");
  }

  if (noiseSim >= 0.75) {
    reasons.push("Compatible noise tolerance and quiet hours expectations");
  }

  if (socialSim >= 0.75) {
    reasons.push("Aligned preferences regarding room visitors and social time");
  }

  if (prefA.foodType && prefB.foodType && foodSim >= 0.7) {
    if (prefA.foodType === prefB.foodType) {
      reasons.push(`Shared dietary background (${prefA.foodType})`);
    } else {
      reasons.push("Comfortable sharing living space despite food differences");
    }
  }

  if (sharedLanguages.length > 0) {
    reasons.push(`Fluent in common: ${sharedLanguages.slice(0, 2).join(" & ")}`);
  }

  if (typeof a.year === "number" && typeof b.year === "number" && a.year === b.year) {
    reasons.push(`Same academic year cohort (Year ${a.year})`);
  }

  // Generate Warnings (Symmetric)
  const warnings = [];
  // AC preference contrast
  if (
    prefA.acPreference &&
    prefB.acPreference &&
    prefA.acPreference !== "no-preference" &&
    prefB.acPreference !== "no-preference" &&
    prefA.acPreference !== prefB.acPreference
  ) {
    const acSorted = [prefA.acPreference, prefB.acPreference].sort();
    warnings.push(
      `Different AC room preferences (${acSorted[0].toUpperCase()} vs ${acSorted[1].toUpperCase()})`
    );
  }

  if (Math.abs(cleanA - cleanB) >= 2) {
    warnings.push("Noticeable difference in cleanliness expectations");
  }

  if (Math.abs(noiseA - noiseB) >= 2) {
    warnings.push("Different sensitivity to noise and background sounds");
  }

  if (sleepSim === 0) {
    warnings.push("Opposite sleep routines (early riser vs night owl)");
  }

  if (studySim === 0) {
    warnings.push("Opposite preferred study hours");
  }

  if (foodSim <= 0.3) {
    warnings.push("Different dietary preferences with low sharing tolerance");
  }

  if (callSim === 0) {
    warnings.push("Different comfort levels with late-night phone conversations");
  }

  if (Math.abs(socialA - socialB) >= 2) {
    warnings.push("Different comfort levels with frequent room guests");
  }

  // Ensure deterministic sort for symmetry
  reasons.sort();
  warnings.sort();

  return {
    excluded: false,
    score: finalScore,
    baseScore,
    yearBonus,
    label: getScoreLabel(finalScore),
    breakdown,
    sharedLanguages,
    reasons,
    warnings,
    engineVersion: ENGINE_VERSION,
  };
}
