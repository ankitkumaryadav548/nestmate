import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { validateAssignments } from "./validateAssignments.js";

describe("Allocation Invariant Validation Engine", () => {
  const createStudent = (id, gender = "male", year = 2, overrides = {}) => ({
    id,
    _id: id,
    name: `Student ${id}`,
    gender,
    year,
    preferences: {
      acPreference: "no-preference",
      foodType: "veg",
      dealBreakers: [],
      ...overrides,
    },
  });

  const hostelH1 = {
    id: "H1",
    _id: "H1",
    code: "BH1",
    gender: "boys",
    isActive: true,
    allowedYears: [],
  };

  const roomR1 = {
    id: "r1",
    _id: "r1",
    hostelId: "H1",
    roomNumber: "101",
    capacity: 2,
    roomType: "AC",
  };

  const roomR2 = {
    id: "r2",
    _id: "r2",
    hostelId: "H1",
    roomNumber: "102",
    capacity: 2,
    roomType: "Non-AC",
  };

  test("1. Valid assignment set passes verification", () => {
    const unit1 = {
      unitId: "u1",
      size: 2,
      members: [createStudent("s1"), createStudent("s2")],
    };

    const assignments = [
      { unitId: "u1", roomId: "r1", hostelId: "H1", unit: unit1, room: roomR1, hostel: hostelH1 },
    ];

    assert.equal(validateAssignments(assignments, [unit1], [roomR1], [hostelH1]), true);
  });

  test("2. Throws error if a room is assigned twice", () => {
    const unit1 = { unitId: "u1", size: 2, members: [createStudent("s1"), createStudent("s2")] };
    const unit2 = { unitId: "u2", size: 2, members: [createStudent("s3"), createStudent("s4")] };

    const duplicateRoomAssignments = [
      { unitId: "u1", roomId: "r1", hostelId: "H1", unit: unit1, room: roomR1, hostel: hostelH1 },
      { unitId: "u2", roomId: "r1", hostelId: "H1", unit: unit2, room: roomR1, hostel: hostelH1 },
    ];

    assert.throws(
      () => validateAssignments(duplicateRoomAssignments, [unit1, unit2], [roomR1], [hostelH1]),
      /Invariant Violation: Room "r1" assigned multiple times/
    );
  });

  test("3. Throws error if a student appears in multiple units", () => {
    // Student s1 placed in both unit1 and unit2
    const unit1 = { unitId: "u1", size: 2, members: [createStudent("s1"), createStudent("s2")] };
    const unit2 = { unitId: "u2", size: 2, members: [createStudent("s1"), createStudent("s3")] };

    const assignments = [
      { unitId: "u1", roomId: "r1", hostelId: "H1", unit: unit1, room: roomR1, hostel: hostelH1 },
      { unitId: "u2", roomId: "r2", hostelId: "H1", unit: unit2, room: roomR2, hostel: hostelH1 },
    ];

    assert.throws(
      () => validateAssignments(assignments, [unit1, unit2], [roomR1, roomR2], [hostelH1]),
      /Invariant Violation: Student "s1" assigned to multiple units/
    );
  });

  test("4. Throws error on capacity mismatch (room capacity !== unit size)", () => {
    const unitOf3 = {
      unitId: "u3",
      size: 3,
      members: [createStudent("s1"), createStudent("s2"), createStudent("s3")],
    };

    const assignments = [
      { unitId: "u3", roomId: "r1", hostelId: "H1", unit: unitOf3, room: roomR1, hostel: hostelH1 },
    ];

    assert.throws(
      () => validateAssignments(assignments, [unitOf3], [roomR1], [hostelH1]),
      /Invariant Violation: Room "101" capacity \(2\) does not equal unit size \(3\)/
    );
  });

  test("5. Throws error on hostel gender or year violation", () => {
    const femaleUnit = {
      unitId: "uFem",
      size: 2,
      members: [createStudent("f1", "female"), createStudent("f2", "female")],
    };

    const assignments = [
      { unitId: "uFem", roomId: "r1", hostelId: "H1", unit: femaleUnit, room: roomR1, hostel: hostelH1 },
    ];

    assert.throws(
      () => validateAssignments(assignments, [femaleUnit], [roomR1], [hostelH1]),
      /Invariant Violation: Hostel "BH1" is not eligible for unit "uFem"/
    );
  });

  test("6. Throws error on hard AC deal-breaker violation", () => {
    const acDealBreakerStudent = createStudent("s1", "male", 2, {
      acPreference: "ac",
      dealBreakers: ["acType"],
    });

    const unit = {
      unitId: "uAc",
      size: 2,
      members: [acDealBreakerStudent, createStudent("s2", "male", 2)],
    };

    // Placed in roomR2 which is Non-AC
    const assignments = [
      { unitId: "uAc", roomId: "r2", hostelId: "H1", unit, room: roomR2, hostel: hostelH1 },
    ];

    assert.throws(
      () => validateAssignments(assignments, [unit], [roomR2], [hostelH1]),
      /has strict AC deal-breaker but was placed in Non-AC room/
    );
  });

  test("7. Throws error if members inside a unit have mutual deal-breaker conflict", () => {
    const vegStudent = createStudent("s1", "male", 2, {
      foodType: "veg",
      dealBreakers: ["food"],
    });
    const nonVegStudent = createStudent("s2", "male", 2, {
      foodType: "non-veg",
    });

    const conflictingUnit = {
      unitId: "uConflict",
      size: 2,
      members: [vegStudent, nonVegStudent],
    };

    const assignments = [
      { unitId: "uConflict", roomId: "r1", hostelId: "H1", unit: conflictingUnit, room: roomR1, hostel: hostelH1 },
    ];

    assert.throws(
      () => validateAssignments(assignments, [conflictingUnit], [roomR1], [hostelH1]),
      /contains members with mutual deal-breaker conflict/
    );
  });
});
