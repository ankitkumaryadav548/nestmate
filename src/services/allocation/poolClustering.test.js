import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  fillFormingGroups,
  handleIncompleteGroups,
  clusterPool,
  improveBySwaps,
} from "./poolClustering.js";
import { checkDealBreakers } from "../matching/scoreEngine.js";

describe("Pool Clustering & Forming Groups Pure Engine", () => {
  const createStudent = (id, gender = "male", overrides = {}) => ({
    id,
    _id: id,
    name: `Student ${id}`,
    gender,
    year: 2,
    preferences: {
      foodType: "veg",
      sleepSchedule: "normal",
      studyTime: "night",
      cleanliness: 4,
      noiseTolerance: 3,
      socialLevel: 3,
      acPreference: "ac",
      languages: ["English", "Hindi"],
      nightCalls: "sometimes",
      dealBreakers: [],
      ...overrides,
    },
  });

  // Mock score function that respects deal-breakers and computes simple score
  const mockScoreFn = (a, b) => {
    const db = checkDealBreakers(a, b);
    if (db.excluded) {
      return { score: 0, excluded: true };
    }
    const cleanDiff = Math.abs((a.preferences.cleanliness || 3) - (b.preferences.cleanliness || 3));
    const score = Math.max(50, 100 - cleanDiff * 15);
    return { score, excluded: false };
  };

  test("1. fillFormingGroups never adds a student who violates a deal-breaker with any member", () => {
    // Member has food deal-breaker ("veg")
    const member = createStudent("m1", "male", { foodType: "veg", dealBreakers: ["food"] });
    const formingGroup = {
      id: "g1",
      targetSize: 2,
      gender: "male",
      members: [member],
    };

    // Candidate is "non-veg"
    const nonVegCandidate = createStudent("c1", "male", { foodType: "non-veg" });
    // Candidate 2 is "veg"
    const vegCandidate = createStudent("c2", "male", { foodType: "veg" });

    const result = fillFormingGroups(
      [formingGroup],
      [nonVegCandidate, vegCandidate],
      {},
      mockScoreFn
    );

    assert.equal(result.filledUnits.length, 1);
    assert.equal(result.filledUnits[0].members.length, 2);
    // Verified that vegCandidate was chosen, not nonVegCandidate
    assert.equal(result.filledUnits[0].members[1].id, "c2");
    assert.equal(result.usedStudentIds.has("c2"), true);
    assert.equal(result.usedStudentIds.has("c1"), false);
  });

  test("2. handleIncompleteGroups shrinks groups with >= 2 members and dissolves 1-member groups", () => {
    const group2 = { id: "g2", targetSize: 3, members: [createStudent("s1"), createStudent("s2")] };
    const group1 = { id: "g1", targetSize: 2, members: [createStudent("s3")] };

    const shrinkRes = handleIncompleteGroups([group2, group1], "shrink", mockScoreFn);
    assert.equal(shrinkRes.shrunkUnits.length, 1);
    assert.equal(shrinkRes.shrunkUnits[0].size, 2);
    assert.equal(shrinkRes.shrunkUnits[0].kind, "shrunk-group");
    assert.equal(shrinkRes.dissolvedStudents.length, 1);
    assert.equal(shrinkRes.dissolvedStudents[0].id, "s3");

    // Waitlist policy puts groups on waitlist
    const waitlistRes = handleIncompleteGroups([group2], "waitlist", mockScoreFn);
    assert.equal(waitlistRes.waitlistedGroups.length, 1);
    assert.equal(waitlistRes.waitlistedGroups[0].reason, "incomplete_group_waitlisted");
  });

  test("3. clusterPool never groups students with mutual deal-breaker conflicts", () => {
    const s1 = createStudent("s1", "female", { foodType: "veg", dealBreakers: ["food"] });
    const s2 = createStudent("s2", "female", { foodType: "non-veg" });
    const s3 = createStudent("s3", "female", { foodType: "veg" });
    const s4 = createStudent("s4", "female", { foodType: "non-veg" });

    const { groups } = clusterPool([s1, s2, s3, s4], {}, mockScoreFn, { defaultRoomSize: 2 });

    // Should create two groups of 2: (s1, s3) and (s2, s4)
    assert.equal(groups.length, 2);
    for (const g of groups) {
      const check = checkDealBreakers(g.members[0], g.members[1]);
      assert.equal(check.excluded, false);
    }
  });

  test("4. clusterPool reports isolated student with no compatible partner as unallocated", () => {
    // s1 has strict deal-breakers conflicting with all peers
    const s1 = createStudent("s1", "male", { nightCalls: "never", dealBreakers: ["lateNightNoise"] });
    const s2 = createStudent("s2", "male", { nightCalls: "often" }); // violates s1
    const s3 = createStudent("s3", "male", { nightCalls: "often" }); // violates s1

    const { groups, unallocated } = clusterPool([s1, s2, s3], {}, mockScoreFn, { defaultRoomSize: 2 });

    // s2 and s3 can form a group of 2
    assert.equal(groups.length, 1);
    assert.deepEqual(groups[0].members.map((m) => m.id).sort(), ["s2", "s3"]);

    // s1 has no compatible partner
    assert.equal(unallocated.length, 1);
    assert.equal(unallocated[0].student.id, "s1");
    assert.equal(unallocated[0].reason, "no_compatible_partner");
  });

  test("5. improveBySwaps never decreases the total compatibility score", () => {
    // Create 2 groups of size 2 where swapping increases compatibility
    // Group 1: (cleanliness 5, cleanliness 1)
    // Group 2: (cleanliness 5, cleanliness 1)
    // If swapped: Group 1 becomes (5, 5) -> score 100, Group 2 becomes (1, 1) -> score 100
    const g1 = {
      members: [createStudent("a1", "male", { cleanliness: 5 }), createStudent("a2", "male", { cleanliness: 1 })],
      size: 2,
      average: 50,
      lowest: 50,
    };
    const g2 = {
      members: [createStudent("b1", "male", { cleanliness: 5 }), createStudent("b2", "male", { cleanliness: 1 })],
      size: 2,
      average: 50,
      lowest: 50,
    };

    const initialSum = g1.average + g2.average;
    const improved = improveBySwaps([g1, g2], {}, mockScoreFn, 3);
    const finalSum = improved[0].average + improved[1].average;

    assert.equal(finalSum >= initialSum, true);
    assert.equal(finalSum, 200); // 100 + 100
  });
});
