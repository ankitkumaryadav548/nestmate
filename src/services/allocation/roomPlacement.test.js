import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  roomMeetsHardConstraints,
  preferenceScore,
  placeUnits,
} from "./roomPlacement.js";

describe("Room Placement Pure Logic & Multi-Round Engine", () => {
  // Test Fixtures
  const createStudent = (id, gender = "male", year = 2, overrides = {}) => ({
    id,
    _id: id,
    name: `Student ${id}`,
    gender,
    year,
    preferences: {
      acPreference: "no-preference",
      dealBreakers: [],
      ...overrides,
    },
  });

  const hostelH1 = {
    id: "H1",
    _id: "H1",
    code: "BH1",
    name: "Boys Hostel 1",
    gender: "boys",
    isActive: true,
    allowedYears: [],
    totalFloors: 4,
  };

  const hostelGH1 = {
    id: "GH1",
    _id: "GH1",
    code: "GH1",
    name: "Girls Hostel 1",
    gender: "girls",
    isActive: true,
    allowedYears: [2, 3],
    totalFloors: 4,
  };

  test("1. Exact capacity match: unit of size N only placed in room of capacity N", () => {
    const unit2 = {
      unitId: "u2",
      kind: "group",
      members: [createStudent("s1"), createStudent("s2")],
      size: 2,
      roomPreferences: { preferredHostels: ["H1"], acType: "no-preference", floorPreference: "any" },
    };

    // Only rooms of capacity 3 and 4 available in H1
    const rooms = [
      { id: "r1", hostelId: "H1", roomNumber: "101", floor: 0, capacity: 3, roomType: "AC" },
      { id: "r2", hostelId: "H1", roomNumber: "102", floor: 0, capacity: 4, roomType: "Non-AC" },
    ];

    const result = placeUnits([unit2], rooms, [hostelH1], { seed: 42 });
    assert.equal(result.assignments.length, 0);
    assert.equal(result.waitlist.length, 1);
    assert.equal(result.waitlist[0].reason, "no_room_of_this_size");
  });

  test("2. Room is used at most once across all units", () => {
    const unitA = {
      unitId: "uA",
      kind: "group",
      members: [createStudent("s1"), createStudent("s2")],
      size: 2,
      roomPreferences: { preferredHostels: ["H1"], acType: "no-preference", floorPreference: "any" },
    };
    const unitB = {
      unitId: "uB",
      kind: "group",
      members: [createStudent("s3"), createStudent("s4")],
      size: 2,
      roomPreferences: { preferredHostels: ["H1"], acType: "no-preference", floorPreference: "any" },
    };

    // Exactly 1 room available
    const rooms = [
      { id: "r1", hostelId: "H1", roomNumber: "101", floor: 0, capacity: 2, roomType: "Non-AC" },
    ];

    const result = placeUnits([unitA, unitB], rooms, [hostelH1], { seed: 42 });
    assert.equal(result.assignments.length, 1);
    assert.equal(result.waitlist.length, 1);
    assert.equal(result.waitlist[0].reason, "all_matching_rooms_taken");
  });

  test("3. Priority rounds: Round 1 choice is prioritized over Round 2 choice", () => {
    // Unit A prefers H1 (1st) then H2 (2nd)
    const unitA = {
      unitId: "uA",
      kind: "group",
      members: [createStudent("s1"), createStudent("s2")],
      size: 2,
      roomPreferences: { preferredHostels: ["H1", "H2"], acType: "no-preference", floorPreference: "any" },
    };
    // Unit B prefers H2 (1st) then H1 (2nd)
    const unitB = {
      unitId: "uB",
      kind: "group",
      members: [createStudent("s3"), createStudent("s4")],
      size: 2,
      roomPreferences: { preferredHostels: ["H2", "H1"], acType: "no-preference", floorPreference: "any" },
    };

    const hostelH2 = { ...hostelH1, id: "H2", _id: "H2", code: "BH2", name: "Boys Hostel 2" };

    // 1 room in H1, 1 room in H2
    const rooms = [
      { id: "rH1", hostelId: "H1", roomNumber: "101", floor: 0, capacity: 2, roomType: "AC" },
      { id: "rH2", hostelId: "H2", roomNumber: "201", floor: 0, capacity: 2, roomType: "AC" },
    ];

    const result = placeUnits([unitA, unitB], rooms, [hostelH1, hostelH2], { seed: 10 });
    assert.equal(result.assignments.length, 2);

    const assignA = result.assignments.find((a) => a.unitId === "uA");
    const assignB = result.assignments.find((a) => a.unitId === "uB");

    // Both get their 1st choice in Round 1
    assert.equal(assignA.hostelId, "H1");
    assert.equal(assignA.round, 1);
    assert.equal(assignB.hostelId, "H2");
    assert.equal(assignB.round, 1);
  });

  test("4. Hostel gender and academic year eligibility rules are strictly enforced", () => {
    // Male unit cannot enter GH1 (girls hostel)
    const maleUnit = {
      unitId: "uMale",
      kind: "group",
      members: [createStudent("m1", "male", 2), createStudent("m2", "male", 2)],
      size: 2,
      roomPreferences: { preferredHostels: ["GH1"], acType: "no-preference", floorPreference: "any" },
    };

    const rooms = [
      { id: "rGH1", hostelId: "GH1", roomNumber: "101", floor: 0, capacity: 2, roomType: "AC" },
    ];

    const resMale = placeUnits([maleUnit], rooms, [hostelGH1], { seed: 42 });
    assert.equal(resMale.assignments.length, 0);
    assert.equal(resMale.waitlist[0].reason, "no_eligible_hostel");

    // Female unit with year 1 rejected by GH1 (which only allows years [2, 3])
    const femaleYear1Unit = {
      unitId: "uFem1",
      kind: "group",
      members: [createStudent("f1", "female", 1), createStudent("f2", "female", 2)],
      size: 2,
      roomPreferences: { preferredHostels: ["GH1"], acType: "no-preference", floorPreference: "any" },
    };

    const resYear = placeUnits([femaleYear1Unit], rooms, [hostelGH1], { seed: 42 });
    assert.equal(resYear.assignments.length, 0);
    assert.equal(resYear.waitlist[0].reason, "no_eligible_hostel");
  });

  test("5. Hard AC deal-breaker constraint prevents placement in conflicting room type", () => {
    const studentWithAcDealBreaker = createStudent("s1", "male", 2, {
      acPreference: "ac",
      dealBreakers: ["acType"],
    });

    const unit = {
      unitId: "uAc",
      kind: "group",
      members: [studentWithAcDealBreaker, createStudent("s2", "male", 2)],
      size: 2,
      roomPreferences: { preferredHostels: ["H1"], acType: "ac", floorPreference: "any" },
    };

    // Only Non-AC room available
    const nonAcRooms = [
      { id: "rNonAc", hostelId: "H1", roomNumber: "101", floor: 0, capacity: 2, roomType: "Non-AC" },
    ];

    const result = placeUnits([unit], nonAcRooms, [hostelH1], { seed: 42 });
    assert.equal(result.assignments.length, 0);
    assert.equal(result.waitlist[0].reason, "ac_requirement_unmet");
  });

  test("6. Soft AC preference falls back to alternate room type in Round 4", () => {
    // Member prefers "ac" as a soft preference, but has NO acType deal-breaker
    const unit = {
      unitId: "uSoftAc",
      kind: "group",
      members: [createStudent("s1", "male", 2, { acPreference: "ac" }), createStudent("s2", "male", 2)],
      size: 2,
      roomPreferences: { preferredHostels: ["H1"], acType: "ac", floorPreference: "any" },
    };

    // Only Non-AC room available
    const nonAcRooms = [
      { id: "rNonAc", hostelId: "H1", roomNumber: "101", floor: 0, capacity: 2, roomType: "Non-AC" },
    ];

    const result = placeUnits([unit], nonAcRooms, [hostelH1], { seed: 42 });
    assert.equal(result.assignments.length, 1);
    assert.equal(result.assignments[0].round, 4); // Placed in fallback round
    assert.equal(result.assignments[0].acMatch, false);
  });

  test("7. Determinism: Identical seed produces identical placement order and assignments", () => {
    const units = [
      { unitId: "u1", kind: "group", members: [createStudent("s1"), createStudent("s2")], size: 2, roomPreferences: { preferredHostels: ["H1"], acType: "no-preference", floorPreference: "any" } },
      { unitId: "u2", kind: "group", members: [createStudent("s3"), createStudent("s4")], size: 2, roomPreferences: { preferredHostels: ["H1"], acType: "no-preference", floorPreference: "any" } },
      { unitId: "u3", kind: "group", members: [createStudent("s5"), createStudent("s6")], size: 2, roomPreferences: { preferredHostels: ["H1"], acType: "no-preference", floorPreference: "any" } },
    ];

    const rooms = [
      { id: "r1", hostelId: "H1", roomNumber: "101", floor: 0, capacity: 2, roomType: "AC" },
      { id: "r2", hostelId: "H1", roomNumber: "102", floor: 0, capacity: 2, roomType: "Non-AC" },
    ];

    const res1 = placeUnits(units, rooms, [hostelH1], { seed: 999, priorityMode: "lottery" });
    const res2 = placeUnits(units, rooms, [hostelH1], { seed: 999, priorityMode: "lottery" });

    assert.deepEqual(
      res1.assignments.map((a) => a.unitId),
      res2.assignments.map((a) => a.unitId)
    );
    assert.deepEqual(
      res1.assignments.map((a) => a.roomId),
      res2.assignments.map((a) => a.roomId)
    );
  });

  test("8. Priority modes order units correctly (seniority & completedAt)", () => {
    // Seniority: Unit with year 4 members should get the only room before unit with year 1
    const juniorUnit = {
      unitId: "uJunior",
      kind: "group",
      members: [createStudent("s1", "male", 1), createStudent("s2", "male", 1)],
      size: 2,
      completedAtMs: 1000,
      roomPreferences: { preferredHostels: ["H1"], acType: "no-preference", floorPreference: "any" },
    };
    const seniorUnit = {
      unitId: "uSenior",
      kind: "group",
      members: [createStudent("s3", "male", 4), createStudent("s4", "male", 4)],
      size: 2,
      completedAtMs: 5000,
      roomPreferences: { preferredHostels: ["H1"], acType: "no-preference", floorPreference: "any" },
    };

    const oneRoom = [
      { id: "r1", hostelId: "H1", roomNumber: "101", floor: 0, capacity: 2, roomType: "AC" },
    ];

    // Under seniority, senior gets room
    const seniorRes = placeUnits([juniorUnit, seniorUnit], oneRoom, [hostelH1], { priorityMode: "seniority", seed: 42 });
    assert.equal(seniorRes.assignments[0].unitId, "uSenior");

    // Under completedAt, junior completed earlier (1000ms vs 5000ms), so junior gets room
    const completedRes = placeUnits([juniorUnit, seniorUnit], oneRoom, [hostelH1], { priorityMode: "completedAt", seed: 42 });
    assert.equal(completedRes.assignments[0].unitId, "uJunior");
  });
});
