import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  calculateCompatibility,
  checkDealBreakers,
  getSharedLanguages,
  calculateFoodSimilarity,
  calculateYearBonus,
} from "./scoreEngine.js";
import { DEFAULT_WEIGHTS } from "../../config/matching.js";

describe("Roommate Compatibility Pure Scoring Engine", () => {
  // Base student template
  const createStudent = (overrides = {}) => ({
    year: 2,
    preferences: {
      sleepSchedule: "normal",
      studyTime: "night",
      cleanliness: 4,
      noiseTolerance: 3,
      socialLevel: 3,
      acPreference: "ac",
      foodType: "veg",
      okWithDifferentFood: true,
      languages: ["English", "Hindi"],
      nightCalls: "sometimes",
      dealBreakers: [],
      ...overrides,
    },
  });

  test("1. Identical students score 100", () => {
    const s1 = createStudent();
    const s2 = createStudent();

    const result = calculateCompatibility(s1, s2);
    assert.equal(result.excluded, false);
    // Base score should be 100, plus year bonus (5) capped at 100
    assert.equal(result.baseScore, 100);
    assert.equal(result.score, 100);
    assert.equal(result.label, "Excellent");
    assert.equal(result.breakdown.length, 7);
    for (const b of result.breakdown) {
      assert.equal(b.percent, 100, `Category ${b.key} should have 100% similarity`);
    }
  });

  test("2. Opposite students score low", () => {
    const s1 = createStudent({
      sleepSchedule: "early",
      studyTime: "morning",
      cleanliness: 5,
      noiseTolerance: 5,
      socialLevel: 1,
      acPreference: "ac",
      foodType: "jain",
      okWithDifferentFood: false,
      languages: ["Gujarati"],
      nightCalls: "never",
    });
    s1.year = 1;

    const s2 = createStudent({
      sleepSchedule: "late",
      studyTime: "night",
      cleanliness: 1,
      noiseTolerance: 1,
      socialLevel: 5,
      acPreference: "non-ac",
      foodType: "non-veg",
      okWithDifferentFood: false,
      languages: ["Malayalam"],
      nightCalls: "often",
    });
    s2.year = 5;

    const result = calculateCompatibility(s1, s2);
    assert.equal(result.excluded, false);
    assert.ok(result.score < 50, `Expected low score, got ${result.score}`);
    assert.equal(result.label, "Low");
    assert.ok(result.warnings.length > 0);
  });

  describe("3 & 4. Mutual Deal-Breaker Exclusions", () => {
    test("Food deal-breaker excludes when food types differ", () => {
      const a = createStudent({ foodType: "veg", dealBreakers: ["food"] });
      const b = createStudent({ foodType: "non-veg", dealBreakers: [] });

      const res = checkDealBreakers(a, b);
      assert.equal(res.excluded, true);
      assert.equal(res.violations[0].by, "B");
      assert.equal(res.violations[0].key, "food");

      // Works in reverse direction (B has deal-breaker)
      const resRev = checkDealBreakers(b, a);
      assert.equal(resRev.excluded, true);
      assert.equal(resRev.violations[0].by, "A");
    });

    test("LateNightNoise deal-breaker excludes when other has nightCalls = often", () => {
      const a = createStudent({ nightCalls: "never", dealBreakers: ["lateNightNoise"] });
      const b = createStudent({ nightCalls: "often", dealBreakers: [] });

      const res = checkDealBreakers(a, b);
      assert.equal(res.excluded, true);
      assert.equal(res.violations[0].key, "lateNightNoise");

      // reverse
      const resRev = checkDealBreakers(b, a);
      assert.equal(resRev.excluded, true);
      assert.equal(resRev.violations[0].by, "A");
    });

    test("Visitors deal-breaker excludes when other has socialLevel >= 4", () => {
      const a = createStudent({ socialLevel: 2, dealBreakers: ["visitors"] });
      const b = createStudent({ socialLevel: 4, dealBreakers: [] });

      const res = checkDealBreakers(a, b);
      assert.equal(res.excluded, true);
      assert.equal(res.violations[0].key, "visitors");

      // acceptable if socialLevel < 4
      const bOk = createStudent({ socialLevel: 3, dealBreakers: [] });
      assert.equal(checkDealBreakers(a, bOk).excluded, false);
    });

    test("Cleanliness deal-breaker excludes when other has cleanliness < 3", () => {
      const a = createStudent({ cleanliness: 5, dealBreakers: ["cleanliness"] });
      const b = createStudent({ cleanliness: 2, dealBreakers: [] });

      const res = checkDealBreakers(a, b);
      assert.equal(res.excluded, true);
      assert.equal(res.violations[0].key, "cleanliness");

      // acceptable if cleanliness >= 3
      const bOk = createStudent({ cleanliness: 3, dealBreakers: [] });
      assert.equal(checkDealBreakers(a, bOk).excluded, false);
    });

    test("ACType deal-breaker excludes when AC preferences directly conflict", () => {
      const a = createStudent({ acPreference: "ac", dealBreakers: ["acType"] });
      const b = createStudent({ acPreference: "non-ac", dealBreakers: [] });

      const res = checkDealBreakers(a, b);
      assert.equal(res.excluded, true);
      assert.equal(res.violations[0].key, "acType");

      // If one has "no-preference", it does NOT violate
      const bNoPref = createStudent({ acPreference: "no-preference", dealBreakers: [] });
      assert.equal(checkDealBreakers(a, bNoPref).excluded, false);
    });

    test("calculateCompatibility returns excluded: true when deal-breaker triggered", () => {
      const a = createStudent({ foodType: "jain", dealBreakers: ["food"] });
      const b = createStudent({ foodType: "halal", dealBreakers: [] });

      const result = calculateCompatibility(a, b);
      assert.equal(result.excluded, true);
      assert.equal(result.score, 0);
      assert.ok(result.violations.length > 0);
    });
  });

  test("5. Symmetry: calculateCompatibility(a, b) === calculateCompatibility(b, a)", () => {
    const s1 = createStudent({
      sleepSchedule: "early",
      studyTime: "flexible",
      cleanliness: 4,
      noiseTolerance: 2,
      socialLevel: 3,
      acPreference: "ac",
      foodType: "veg",
      okWithDifferentFood: true,
      languages: ["English", "Tamil", "Hindi"],
      nightCalls: "never",
    });
    s1.year = 3;

    const s2 = createStudent({
      sleepSchedule: "normal",
      studyTime: "night",
      cleanliness: 3,
      noiseTolerance: 4,
      socialLevel: 2,
      acPreference: "no-preference",
      foodType: "eggetarian",
      okWithDifferentFood: false,
      languages: ["Hindi", "English", "Telugu"],
      nightCalls: "sometimes",
    });
    s2.year = 2;

    const res12 = calculateCompatibility(s1, s2);
    const res21 = calculateCompatibility(s2, s1);

    assert.equal(res12.score, res21.score, "Scores must be identical");
    assert.equal(res12.baseScore, res21.baseScore, "Base scores must be identical");
    assert.equal(res12.yearBonus, res21.yearBonus, "Year bonuses must be identical");
    assert.equal(res12.label, res21.label, "Labels must be identical");
    assert.deepEqual(res12.sharedLanguages, res21.sharedLanguages, "Shared languages must match");
    assert.deepEqual(res12.breakdown, res21.breakdown, "Breakdown must match");
    assert.deepEqual(res12.reasons, res21.reasons, "Reasons must match");
    assert.deepEqual(res12.warnings, res21.warnings, "Warnings must match");
  });

  test("6. Year Bonus behavior", () => {
    assert.equal(calculateYearBonus(2, 2), 5, "Same year gives 5 points");
    assert.equal(calculateYearBonus(2, 3), 2, "1 year apart gives 2 points");
    assert.equal(calculateYearBonus(3, 2), 2, "1 year apart gives 2 points (symmetric)");
    assert.equal(calculateYearBonus(1, 3), 0, "2 years apart gives 0 points");
    assert.equal(calculateYearBonus(null, 2), 0, "Null year gives 0 points");

    // Cap at 100
    const s1 = createStudent({ year: 2 });
    const s2 = createStudent({ year: 2 });
    const res = calculateCompatibility(s1, s2);
    assert.equal(res.baseScore, 100);
    assert.equal(res.yearBonus, 5);
    assert.equal(res.score, 100, "Score cannot exceed 100");
  });

  test("7. okWithDifferentFood rule", () => {
    // veg & non-veg has 0 table similarity
    // Both ok => 0.6
    const simBothOk = calculateFoodSimilarity(
      { foodType: "veg", okWithDifferentFood: true },
      { foodType: "non-veg", okWithDifferentFood: true }
    );
    assert.equal(simBothOk, 0.6);

    // One ok => 0.3
    const simOneOk = calculateFoodSimilarity(
      { foodType: "veg", okWithDifferentFood: true },
      { foodType: "non-veg", okWithDifferentFood: false }
    );
    assert.equal(simOneOk, 0.3);

    // Neither ok => 0.0
    const simNeitherOk = calculateFoodSimilarity(
      { foodType: "veg", okWithDifferentFood: false },
      { foodType: "non-veg", okWithDifferentFood: false }
    );
    assert.equal(simNeitherOk, 0.0);
  });

  test("8. Custom weights support", () => {
    const s1 = createStudent({ cleanliness: 5 });
    const s2 = createStudent({ cleanliness: 1 }); // cleanliness sim = 0

    // With default cleanliness weight (15)
    const defaultRes = calculateCompatibility(s1, s2);

    // Shift weight entirely to cleanliness: cleanliness 100, others 0
    const customWeights = {
      sleepSchedule: 0,
      studyTime: 0,
      cleanliness: 100,
      noiseTolerance: 0,
      foodType: 0,
      socialLevel: 0,
      languageAndCalls: 0,
    };

    const customRes = calculateCompatibility(s1, s2, customWeights);
    // Since cleanliness similarity is 0 and cleanliness weight is 100, baseScore must be 0
    assert.equal(customRes.baseScore, 0);
    // Plus 5 year bonus
    assert.equal(customRes.score, 5);
  });
});
