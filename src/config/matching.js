/**
 * Roommate Matching Configuration & Constants
 * 
 * FAIRNESS & NON-DISCRIMINATION GUARANTEE:
 * Matching uses ONLY lifestyle preferences (sleep schedule, study time, cleanliness, noise, food, social, languages).
 * Nationality, home country, home state, and ethnicity must NEVER be used in scoring or filtering to prevent
 * segregation or bias and to uphold institutional non-discrimination standards.
 * 
 * NOTE: The 'culturalComfort' field is stored in the database but is NOT used in scoring yet.
 * It is reserved for future non-discriminatory opt-in peer discovery.
 * 
 * GENDER POLICY: Same gender is a hard rule: "male" matches only with "male", "female" with "female",
 * and "other" with "other". Note that students with gender "other" will have a smaller candidate pool.
 */

export const ENGINE_VERSION = "1.0";

/**
 * Default weights allocated across the 7 lifestyle categories.
 * MUST ALWAYS SUM UP TO EXACTLY 100.
 */
export const DEFAULT_WEIGHTS = {
  sleepSchedule: 20,
  studyTime: 20,
  cleanliness: 15,
  noiseTolerance: 15,
  foodType: 10,
  socialLevel: 10,
  languageAndCalls: 10,
};

/**
 * Academic Year Bonus Points.
 * Added to the weighted base score; final score is capped at 100.
 */
export const YEAR_BONUS = {
  sameYear: 5,
  oneYearApart: 2,
  otherwise: 0,
};

/**
 * Categorical labels applied based on final compatibility score (0 - 100).
 */
export const SCORE_LABELS = {
  EXCELLENT: "Excellent", // 85 - 100
  GOOD: "Good",           // 70 - 84
  FAIR: "Fair",           // 50 - 69
  LOW: "Low",             // 0 - 49
};

export function getScoreLabel(score) {
  if (score >= 85) return SCORE_LABELS.EXCELLENT;
  if (score >= 70) return SCORE_LABELS.GOOD;
  if (score >= 50) return SCORE_LABELS.FAIR;
  return SCORE_LABELS.LOW;
}

/**
 * Sleep Schedule Similarity Matrix
 * Options: early, normal, late
 */
export const SLEEP_SIMILARITY = {
  early: { early: 1.0, normal: 0.5, late: 0.0 },
  normal: { early: 0.5, normal: 1.0, late: 0.5 },
  late: { early: 0.0, normal: 0.5, late: 1.0 },
};

/**
 * Study Time Similarity Matrix
 * Options: morning, daytime, night, flexible
 */
export const STUDY_SIMILARITY = {
  morning: { morning: 1.0, daytime: 0.5, night: 0.0, flexible: 0.75 },
  daytime: { morning: 0.5, daytime: 1.0, night: 0.5, flexible: 0.75 },
  night: { morning: 0.0, daytime: 0.5, night: 1.0, flexible: 0.75 },
  flexible: { morning: 0.75, daytime: 0.75, night: 0.75, flexible: 1.0 },
};

/**
 * Food Type Base Similarity Matrix
 * Options: veg, non-veg, eggetarian, halal, jain
 */
export const FOOD_SIMILARITY_PAIRS = {
  "veg:jain": 0.7,
  "jain:veg": 0.7,
  "veg:eggetarian": 0.7,
  "eggetarian:veg": 0.7,
  "non-veg:eggetarian": 0.7,
  "eggetarian:non-veg": 0.7,
  "non-veg:halal": 0.8,
  "halal:non-veg": 0.8,
};

/**
 * Night Calls Similarity Matrix
 * Options: never, sometimes, often
 */
export const NIGHT_CALLS_SIMILARITY = {
  never: { never: 1.0, sometimes: 0.5, often: 0.0 },
  sometimes: { never: 0.5, sometimes: 1.0, often: 0.5 },
  often: { never: 0.0, sometimes: 0.5, often: 1.0 },
};

/**
 * Deal-breaker rule definitions.
 * Deal-breakers are non-negotiable boundaries defined by students.
 */
export const DEAL_BREAKER_KEYS = [
  "food",
  "lateNightNoise",
  "visitors",
  "cleanliness",
  "acType",
];

export const CATEGORY_LABELS = {
  sleepSchedule: "Sleep Schedule",
  studyTime: "Study Hours",
  cleanliness: "Cleanliness & Organization",
  noiseTolerance: "Noise Tolerance",
  foodType: "Food & Dietary Habits",
  socialLevel: "Social & Guest Level",
  languageAndCalls: "Languages & Night Calls",
};
