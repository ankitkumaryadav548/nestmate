import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { calculateGroupScore, canJoinGroup } from "./groupScore.js";
import { calculateCompatibility } from "./scoreEngine.js";

describe("Roommate Group Score Pure Module", () => {
  const createStudent = (name, overrides = {}) => ({
    name,
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

  test("1. Group of 2 equals the pairwise score", () => {
    const s1 = createStudent("Alice", { sleepSchedule: "early" });
    const s2 = createStudent("Bob", { sleepSchedule: "normal" });

    const pairRes = calculateCompatibility(s1, s2);
    const groupRes = calculateGroupScore([s1, s2]);

    assert.equal(groupRes.pairs.length, 1);
    assert.equal(groupRes.average, pairRes.score);
    assert.equal(groupRes.lowest, pairRes.score);
    assert.deepEqual(groupRes.lowestPair, [0, 1]);
    assert.equal(groupRes.hasExcludedPair, false);
  });

  test("2. Average and lowest for 3 and 4 members", () => {
    const s1 = createStudent("Member 1", { cleanliness: 5, noiseTolerance: 4 });
    const s2 = createStudent("Member 2", { cleanliness: 4, noiseTolerance: 3 });
    const s3 = createStudent("Member 3", { cleanliness: 3, noiseTolerance: 2 });
    const s4 = createStudent("Member 4", { cleanliness: 2, noiseTolerance: 1 });

    // 3 members: pairs (0,1), (0,2), (1,2)
    const res3 = calculateGroupScore([s1, s2, s3]);
    assert.equal(res3.pairs.length, 3);
    const manualAvg3 = Math.round((res3.pairs[0].score + res3.pairs[1].score + res3.pairs[2].score) / 3);
    assert.equal(res3.average, manualAvg3);
    assert.equal(res3.lowest, Math.min(...res3.pairs.map((p) => p.score)));

    // 4 members: 6 pairs
    const res4 = calculateGroupScore([s1, s2, s3, s4]);
    assert.equal(res4.pairs.length, 6);
    const manualAvg4 = Math.round(res4.pairs.reduce((acc, p) => acc + p.score, 0) / 6);
    assert.equal(res4.average, manualAvg4);
    assert.equal(res4.lowest, Math.min(...res4.pairs.map((p) => p.score)));
  });

  test("3. One blocked member (deal-breaker) blocks the whole join", () => {
    // Current members: Alice & Bob
    const alice = createStudent("Alice", { foodType: "jain", dealBreakers: ["food"] });
    const bob = createStudent("Bob", { foodType: "jain", dealBreakers: [] });

    // Candidate Charlie eats non-veg, which violates Alice's deal-breaker
    const charlie = createStudent("Charlie", { foodType: "non-veg", dealBreakers: [] });

    const joinCheck = canJoinGroup(charlie, [alice, bob]);
    assert.equal(joinCheck.allowed, false);
    assert.ok(joinCheck.blockedBy.includes(0), "Alice (index 0) must block Charlie");
    assert.equal(joinCheck.perMemberScores[0].excluded, true);
    assert.equal(joinCheck.perMemberScores[1].excluded, false);
  });

  test("4. Order independence for canJoinGroup", () => {
    const s1 = createStudent("A", { sleepSchedule: "early", cleanliness: 5 });
    const s2 = createStudent("B", { sleepSchedule: "normal", cleanliness: 3 });
    const candidate = createStudent("C", { sleepSchedule: "late", cleanliness: 2 });

    const check1 = canJoinGroup(candidate, [s1, s2]);
    const check2 = canJoinGroup(candidate, [s2, s1]);

    assert.equal(check1.allowed, check2.allowed);
    assert.equal(check1.average, check2.average);
    assert.equal(check1.lowest, check2.lowest);
  });

  test("5. The minPairScore rule", () => {
    const s1 = createStudent("A", { cleanliness: 5, noiseTolerance: 5, socialLevel: 1 });
    const candidate = createStudent("Candidate", { cleanliness: 1, noiseTolerance: 1, socialLevel: 5 });

    // With minPairScore = 0 (only deal-breakers block)
    const checkAllow = canJoinGroup(candidate, [s1], undefined, 0);
    assert.equal(checkAllow.allowed, true);

    // With minPairScore = 70 (high threshold)
    const checkDeny = canJoinGroup(candidate, [s1], undefined, 70);
    assert.equal(checkDeny.allowed, false);
    assert.ok(checkDeny.blockedBy.includes(0));
  });
});
