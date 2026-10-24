import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { evaluateRooms, buildRandomBaseline, summarizePreferenceSatisfaction } from "./metrics.js";

describe("Allocation Metrics & Random Baseline Pure Module", () => {
  const studentA = { id: "a", name: "A" };
  const studentB = { id: "b", name: "B" };
  const studentC = { id: "c", name: "C" };
  const studentD = { id: "d", name: "D" };

  test("1. evaluateRooms counts excluded pairs as score 0 and tracks conflicts", () => {
    // Room 1: (A, B) -> compatible, score 80
    // Room 2: (C, D) -> deal-breaker excluded, score 0
    const mockScoreFn = (x, y) => {
      if ((x.id === "c" && y.id === "d") || (x.id === "d" && y.id === "c")) {
        return { score: 0, excluded: true };
      }
      return { score: 80, excluded: false };
    };

    const res = evaluateRooms([[studentA, studentB], [studentC, studentD]], mockScoreFn);

    assert.equal(res.rooms, 2);
    assert.equal(res.studentsCount, 4);
    assert.equal(res.pairsTotal, 2);
    assert.equal(res.pairsExcluded, 1);
    assert.equal(res.roomsWithConflict, 1);
    // Average pair score: (80 + 0) / 2 = 40
    assert.equal(res.avgPairScore, 40);
  });

  test("2. buildRandomBaseline uses identical student count and room capacities", () => {
    const studentsByGender = {
      male: [studentA, studentB, studentC, studentD],
    };
    const capacitiesByGender = {
      male: [2, 2],
    };

    const mockScoreFn = () => ({ score: 75, excluded: false });

    const baseline = buildRandomBaseline(studentsByGender, capacitiesByGender, mockScoreFn, 42, 5);

    assert.equal(baseline.trials, 5);
    assert.equal(baseline.avg.pairsTotal, 2);
    assert.equal(baseline.avg.avgPairScore, 75);
  });

  test("3. buildRandomBaseline is strictly deterministic with the same seed", () => {
    const studentsByGender = {
      female: [studentA, studentB, studentC, studentD],
    };
    const capacitiesByGender = {
      female: [2, 2],
    };

    const mockScoreFn = (x, y) => {
      const code = x.id.charCodeAt(0) + y.id.charCodeAt(0);
      return { score: (code * 17) % 100, excluded: code % 7 === 0 };
    };

    const base1 = buildRandomBaseline(studentsByGender, capacitiesByGender, mockScoreFn, 1234, 10);
    const base2 = buildRandomBaseline(studentsByGender, capacitiesByGender, mockScoreFn, 1234, 10);

    assert.deepEqual(base1.avg, base2.avg);
    assert.deepEqual(base1.bestTrial, base2.bestTrial);
    assert.deepEqual(base1.worstTrial, base2.worstTrial);
  });

  test("4. summarizePreferenceSatisfaction calculates percentages accurately", () => {
    const assignments = [
      { unitId: "u1", hostelRank: 1, acMatch: true, floorMatch: true, unit: { roomPreferences: { preferredHostels: ["H1"], acType: "ac", floorPreference: "mid" } } },
      { unitId: "u2", hostelRank: 2, acMatch: false, floorMatch: true, unit: { roomPreferences: { preferredHostels: ["H1", "H2"], acType: "ac", floorPreference: "low" } } },
      { unitId: "u3", hostelRank: 0, acMatch: null, floorMatch: null, unit: { roomPreferences: { preferredHostels: ["H3"], acType: "no-preference", floorPreference: "any" } } },
    ];

    const summary = summarizePreferenceSatisfaction(assignments);

    assert.equal(summary.withHostelPrefs, 3);
    assert.equal(summary.rank1.count, 1);
    assert.equal(summary.rank1.percent, 33);
    assert.equal(summary.rank2.count, 1);
    assert.equal(summary.rank2.percent, 33);
    assert.equal(summary.other.count, 1);
    assert.equal(summary.other.percent, 33);

    // AC requested: 2 units (u1, u2), 1 satisfied
    assert.equal(summary.acRequested, 2);
    assert.equal(summary.acSatisfied.count, 1);
    assert.equal(summary.acSatisfied.percent, 50);

    // Floor requested: 2 units (u1, u2), 2 satisfied
    assert.equal(summary.floorRequested, 2);
    assert.equal(summary.floorSatisfied.count, 2);
    assert.equal(summary.floorSatisfied.percent, 100);
  });
});
