import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateBedAssignments,
  autoAssignRemaining,
} from "./bedRules.js";

describe("Bed Assignment Pure Rules Suite", () => {
  const members = ["user_1", "user_2", "user_3"];
  const capacity = 3;

  it("valid assignment: successfully assigns valid beds within capacity", () => {
    const res = validateBedAssignments({
      capacity,
      members,
      assignments: [
        { userId: "user_1", bedNumber: 1 },
        { userId: "user_2", bedNumber: 2 },
      ],
      currentMap: {},
    });

    assert.equal(res.ok, true);
    assert.equal(res.error, null);
    assert.deepEqual(res.finalMap, {
      user_1: 1,
      user_2: 2,
      user_3: null,
    });
  });

  it("swap two members: allows two roommates to swap bed numbers in one transaction", () => {
    const currentMap = {
      user_1: 1,
      user_2: 2,
      user_3: 3,
    };

    const res = validateBedAssignments({
      capacity,
      members,
      assignments: [
        { userId: "user_1", bedNumber: 2 },
        { userId: "user_2", bedNumber: 1 },
      ],
      currentMap,
    });

    assert.equal(res.ok, true);
    assert.deepEqual(res.finalMap, {
      user_1: 2,
      user_2: 1,
      user_3: 3,
    });
  });

  it("duplicate bed: rejects when two users are assigned the same bed number in the request", () => {
    const res = validateBedAssignments({
      capacity,
      members,
      assignments: [
        { userId: "user_1", bedNumber: 2 },
        { userId: "user_2", bedNumber: 2 },
      ],
      currentMap: {},
    });

    assert.equal(res.ok, false);
    assert.match(res.error, /duplicate bed number 2/i);
  });

  it("conflict with unchanged member: rejects when assigning a bed already held by an unedited member", () => {
    const currentMap = {
      user_1: 1,
      user_2: 2,
      user_3: 3,
    };

    // user_1 tries to take bed 3 without user_3 changing
    const res = validateBedAssignments({
      capacity,
      members,
      assignments: [
        { userId: "user_1", bedNumber: 3 },
      ],
      currentMap,
    });

    assert.equal(res.ok, false);
    assert.match(res.error, /already used by another roommate/i);
  });

  it("out of range: rejects non-integers, 0, negative, and numbers exceeding capacity", () => {
    const resUnder = validateBedAssignments({
      capacity,
      members,
      assignments: [{ userId: "user_1", bedNumber: 0 }],
    });
    assert.equal(resUnder.ok, false);
    assert.match(resUnder.error, /between 1 and 3/i);

    const resOver = validateBedAssignments({
      capacity,
      members,
      assignments: [{ userId: "user_1", bedNumber: 4 }],
    });
    assert.equal(resOver.ok, false);
    assert.match(resOver.error, /between 1 and 3/i);

    const resFloat = validateBedAssignments({
      capacity,
      members,
      assignments: [{ userId: "user_1", bedNumber: 1.5 }],
    });
    assert.equal(resFloat.ok, false);
    assert.match(resFloat.error, /integer/i);
  });

  it("unknown user: rejects assignment containing a userId not in room members", () => {
    const res = validateBedAssignments({
      capacity,
      members,
      assignments: [
        { userId: "intruder_99", bedNumber: 1 },
      ],
    });

    assert.equal(res.ok, false);
    assert.match(res.error, /unknown user/i);
  });

  it("clearing a bed: allows setting bedNumber to null to unassign a member", () => {
    const currentMap = {
      user_1: 1,
      user_2: 2,
      user_3: 3,
    };

    const res = validateBedAssignments({
      capacity,
      members,
      assignments: [
        { userId: "user_1", bedNumber: null },
      ],
      currentMap,
    });

    assert.equal(res.ok, true);
    assert.equal(res.finalMap.user_1, null);
    assert.equal(res.finalMap.user_2, 2);
    assert.equal(res.finalMap.user_3, 3);
  });

  it("auto-assign order: deterministically fills lowest free beds for unassigned members", () => {
    const currentMap = {
      user_1: null,
      user_2: 2, // bed 2 taken
      user_3: null,
    };

    // Free beds are 1 and 3
    const finalMap = autoAssignRemaining(capacity, currentMap, ["user_1", "user_2", "user_3"]);

    assert.equal(finalMap.user_1, 1); // gets lowest (1)
    assert.equal(finalMap.user_2, 2); // stays 2
    assert.equal(finalMap.user_3, 3); // gets next lowest (3)
  });

  it("capacity 1: single-seater allocation correctly handles bed 1", () => {
    const singleMember = ["single_student"];
    const res = validateBedAssignments({
      capacity: 1,
      members: singleMember,
      assignments: [{ userId: "single_student", bedNumber: 1 }],
      currentMap: {},
    });

    assert.equal(res.ok, true);
    assert.equal(res.finalMap.single_student, 1);

    const autoMap = autoAssignRemaining(1, {}, singleMember);
    assert.equal(autoMap.single_student, 1);
  });
});

