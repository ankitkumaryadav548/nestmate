import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  moveUnit,
  swapRooms,
  swapMembers,
  unassignUnit,
  assignWaitlisted,
} from "./editOperations.js";

describe("Allocation Manual Edit Operations (Pure)", () => {
  const dummyScoreFn = (a, b) => {
    // Deal-breaker if both have dealBreaker "food" and different foodType
    if (a.preferences?.foodType && b.preferences?.foodType && a.preferences.foodType !== b.preferences.foodType) {
      if (a.preferences.dealBreakers?.includes("food") || b.preferences.dealBreakers?.includes("food")) {
        return { score: 0, excluded: true };
      }
    }
    return { score: 85, excluded: false };
  };

  const studentA1 = {
    id: "s1",
    name: "Aman",
    gender: "male",
    year: 1,
    preferences: { foodType: "veg", dealBreakers: ["food"], acPreference: "ac" },
  };
  const studentA2 = {
    id: "s2",
    name: "Bharat",
    gender: "male",
    year: 1,
    preferences: { foodType: "veg", dealBreakers: [] },
  };
  const studentB1 = {
    id: "s3",
    name: "Chetan",
    gender: "male",
    year: 2,
    preferences: { foodType: "non-veg", dealBreakers: ["food"] },
  };
  const studentB2 = {
    id: "s4",
    name: "Deepak",
    gender: "male",
    year: 2,
    preferences: { foodType: "non-veg", dealBreakers: [] },
  };

  const unitA = {
    unitId: "uA",
    kind: "group",
    size: 2,
    gender: "male",
    members: [studentA1, studentA2],
    roomPreferences: { preferredHostels: ["h1"], acType: "ac", floorPreference: "low" },
  };

  const unitB = {
    unitId: "uB",
    kind: "group",
    size: 2,
    gender: "male",
    members: [studentB1, studentB2],
    roomPreferences: { preferredHostels: ["h1"], acType: "ac", floorPreference: "mid" },
  };

  const unitC = {
    unitId: "uC",
    kind: "group",
    size: 3,
    gender: "male",
    members: [studentA1, studentA2, studentB2],
    roomPreferences: {},
  };

  const room1 = { id: "r1", roomNumber: "101", floor: 1, capacity: 2, roomType: "AC", hostelId: "h1", currentOccupancy: 0 };
  const room2 = { id: "r2", roomNumber: "102", floor: 2, capacity: 2, roomType: "AC", hostelId: "h1", currentOccupancy: 0 };
  const room3 = { id: "r3", roomNumber: "201", floor: 1, capacity: 3, roomType: "AC", hostelId: "h1", currentOccupancy: 0 };
  const roomFemale = { id: "rf", roomNumber: "G101", floor: 1, capacity: 2, roomType: "AC", hostelId: "hG", currentOccupancy: 0 };

  const hostel1 = { id: "h1", code: "BH1", name: "Boys Hostel 1", gender: "boys", isActive: true, allowedYears: [1, 2, 3, 4], totalFloors: 4 };
  const hostelSenior = { id: "hSenior", code: "BH3", name: "Senior Boys Hostel", gender: "boys", isActive: true, allowedYears: [3, 4], totalFloors: 3 };
  const hostelGirls = { id: "hG", code: "GH1", name: "Girls Hostel", gender: "girls", isActive: true, allowedYears: [1, 2, 3, 4], totalFloors: 3 };

  const rooms = [room1, room2, room3, roomFemale, { id: "rSenior", roomNumber: "301", floor: 1, capacity: 2, roomType: "AC", hostelId: "hSenior", currentOccupancy: 0 }];
  const hostels = [hostel1, hostelSenior, hostelGirls];

  const initialAssignments = [
    {
      unitId: "uA",
      unit: unitA,
      room: room1,
      roomId: "r1",
      hostel: hostel1,
      hostelId: "h1",
      status: "assigned",
      size: 2,
    },
    {
      unitId: "uB",
      unit: unitB,
      room: room2,
      roomId: "r2",
      hostel: hostel1,
      status: "assigned",
      size: 2,
    },
    {
      unitId: "uC",
      unit: unitC,
      room: null,
      roomId: null,
      hostel: null,
      hostelId: null,
      status: "waitlisted",
      waitlistReason: "no_room_of_this_size",
      size: 3,
    },
  ];

  it("1. moves to a used room, wrong capacity, wrong gender hostel and year-blocked hostel are rejected", () => {
    // Used room (r2 is already assigned to uB)
    const resUsed = moveUnit(initialAssignments, [unitA, unitB], rooms, hostels, "uA", "r2", dummyScoreFn);
    assert.equal(resUsed.ok, false);
    assert.match(resUsed.error, /already assigned/i);

    // Wrong capacity (r3 has capacity 3, uA has size 2)
    const resCap = moveUnit(initialAssignments, [unitA, unitB], rooms, hostels, "uA", "r3", dummyScoreFn);
    assert.equal(resCap.ok, false);
    assert.match(resCap.error, /capacity/i);

    // Wrong gender hostel (rf is in girls hostel)
    const resGender = moveUnit(initialAssignments, [unitA, unitB], rooms, hostels, "uA", "rf", dummyScoreFn);
    assert.equal(resGender.ok, false);
    assert.match(resGender.error, /hard constraints/i);

    // Year-blocked hostel (rSenior allows years 3 and 4; uA has year 1 members)
    const resYear = moveUnit(initialAssignments, [unitA, unitB], rooms, hostels, "uA", "rSenior", dummyScoreFn);
    assert.equal(resYear.ok, false);
    assert.match(resYear.error, /hard constraints/i);
  });

  it("2. swap rooms with different sizes is rejected", () => {
    const assignWithSize3 = [
      ...initialAssignments.filter((a) => a.unitId !== "uC"),
      {
        unitId: "uC",
        unit: unitC,
        room: room3,
        roomId: "r3",
        hostel: hostel1,
        hostelId: "h1",
        status: "assigned",
        size: 3,
      },
    ];

    const res = swapRooms(assignWithSize3, [unitA, unitC], rooms, hostels, "uA", "uC", dummyScoreFn);
    assert.equal(res.ok, false);
    assert.match(res.error, /does not equal/i);
  });

  it("3. swapRooms between units of the same size succeeds and updates assignments immutably", () => {
    const res = swapRooms(initialAssignments, [unitA, unitB], rooms, hostels, "uA", "uB", dummyScoreFn);
    assert.equal(res.ok, true);
    assert.equal(res.affectedUnitIds.length, 2);

    const newA = res.newAssignments.find((a) => a.unitId === "uA");
    const newB = res.newAssignments.find((a) => a.unitId === "uB");
    assert.equal(newA.roomId, "r2");
    assert.equal(newB.roomId, "r1");

    // Original assignments not mutated
    assert.equal(initialAssignments[0].roomId, "r1");
  });

  it("4. swapMembers creating a deal-breaker conflict requires override", () => {
    // Swapping studentA1 (veg, dealBreaker food) with studentB1 (non-veg, dealBreaker food)
    // Put studentA1 with studentB2 (non-veg) -> conflict!
    const res = swapMembers(
      initialAssignments,
      [unitA, unitB],
      rooms,
      hostels,
      "uA",
      "s2", // Bharat (veg, no dealBreaker)
      "uB",
      "s3", // Chetan (non-veg, dealBreaker food)
      dummyScoreFn
    );

    // Unit A now has studentA1 (veg, dealBreaker) and Chetan (non-veg, dealBreaker) -> conflict!
    assert.equal(res.ok, false);
    assert.equal(res.requiresOverride, true);
    assert.ok(res.conflictingPairs.length > 0);

    // When confirmOverride is passed with overrideReason, it succeeds
    const resOverridden = swapMembers(
      initialAssignments,
      [unitA, unitB],
      rooms,
      hostels,
      "uA",
      "s2",
      "uB",
      "s3",
      dummyScoreFn,
      { confirmOverride: true, overrideReason: "Admin special arrangement" }
    );
    assert.equal(resOverridden.ok, true);
    assert.equal(resOverridden.requiresOverride, true);
  });

  it("5. unassign then assignWaitlisted works smoothly", () => {
    // Unassign uA
    const resUnassign = unassignUnit(initialAssignments, [unitA, unitB], rooms, hostels, "uA");
    assert.equal(resUnassign.ok, true);
    const unassignedA = resUnassign.newAssignments.find((a) => a.unitId === "uA");
    assert.equal(unassignedA.status, "waitlisted");
    assert.equal(unassignedA.waitlistReason, "manually_unassigned");
    assert.equal(unassignedA.roomId, null);

    // Now assign uA back to room1 (which is now free)
    const resReassign = assignWaitlisted(
      resUnassign.newAssignments,
      [unitA, unitB],
      rooms,
      hostels,
      "uA",
      "r1",
      dummyScoreFn
    );
    assert.equal(resReassign.ok, true);
    const reassignedA = resReassign.newAssignments.find((a) => a.unitId === "uA");
    assert.equal(reassignedA.status, "assigned");
    assert.equal(reassignedA.roomId, "r1");
    assert.equal(reassignedA.waitlistReason, null);
  });

  it("6. inputs are never mutated by any operation", () => {
    const originalAssignmentsSnapshot = JSON.stringify(initialAssignments);
    const originalUnitASnapshot = JSON.stringify(unitA);

    moveUnit(initialAssignments, [unitA, unitB], rooms, hostels, "uA", "r2", dummyScoreFn);
    unassignUnit(initialAssignments, [unitA, unitB], rooms, hostels, "uA");

    assert.equal(JSON.stringify(initialAssignments), originalAssignmentsSnapshot);
    assert.equal(JSON.stringify(unitA), originalUnitASnapshot);
  });
});
