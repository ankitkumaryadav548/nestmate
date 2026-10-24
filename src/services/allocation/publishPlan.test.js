import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildPublishPlan } from "./publishPlan.js";

describe("Allocation Publish Plan Engine (Pure)", () => {
  const student1 = { id: "s1", name: "Student 1", gender: "male", year: 1, isDemo: true, preferences: {} };
  const student2 = { id: "s2", name: "Student 2", gender: "male", year: 1, isDemo: true, preferences: {} };
  const student3 = { id: "s3", name: "Student 3", gender: "male", year: 1, isDemo: true, preferences: {} };
  const student4 = { id: "s4", name: "Student 4", gender: "male", year: 1, isDemo: true, preferences: {} };

  const unitExisting = {
    unitId: "u1",
    kind: "group",
    sourceGroupId: "g1",
    size: 2,
    gender: "male",
    members: [student1, student2],
  };

  const unitFilled = {
    unitId: "u2",
    kind: "filled-group",
    sourceGroupId: "g2",
    size: 2,
    gender: "male",
    members: [student1, student3],
  };

  const unitShrunk = {
    unitId: "u3",
    kind: "shrunk-group",
    sourceGroupId: "g3",
    size: 2,
    gender: "male",
    members: [student1, student2],
  };

  const unitPool = {
    unitId: "u4",
    kind: "pool-group",
    sourceGroupId: null,
    size: 2,
    gender: "male",
    members: [student1, student4],
  };

  const roomClean = { id: "r1", roomNumber: "101", capacity: 2, currentOccupancy: 0, status: "available", hostelId: "h1", roomType: "AC" };
  const roomOccupied = { id: "rOcc", roomNumber: "102", capacity: 2, currentOccupancy: 1, status: "available", hostelId: "h1", roomType: "AC" };
  const roomMaint = { id: "rMaint", roomNumber: "103", capacity: 2, currentOccupancy: 0, status: "maintenance", hostelId: "h1", roomType: "AC" };
  const roomCapacity3 = { id: "rCap3", roomNumber: "104", capacity: 3, currentOccupancy: 0, status: "available", hostelId: "h1", roomType: "AC" };

  const hostelActive = { id: "h1", code: "BH1", name: "Boys Hostel 1", gender: "boys", isActive: true, allowedYears: [1, 2, 3, 4] };
  const hostelInactive = { id: "hInact", code: "BHX", name: "Inactive Hostel", gender: "boys", isActive: false, allowedYears: [1, 2, 3, 4] };
  const hostelYearBlocked = { id: "hYear", code: "BH2", name: "Senior Hostel", gender: "boys", isActive: true, allowedYears: [3, 4] };

  const liveGroup1 = { id: "g1", status: "complete", targetSize: 2, members: [{ user: "s1" }, { user: "s2" }] };
  const liveGroup2 = { id: "g2", status: "forming", targetSize: 2, members: [{ user: "s1" }] };
  const liveGroup3 = { id: "g3", status: "forming", targetSize: 3, members: [{ user: "s1" }, { user: "s2" }] };

  it("1. plan for the four group actions is created correctly when clean", () => {
    const assignments = [
      { unitId: "u1", unit: unitExisting, roomId: "r1", hostelId: "h1", status: "assigned" },
    ];

    const res = buildPublishPlan({
      assignments,
      units: [unitExisting],
      liveRoomsState: [roomClean],
      liveGroupsState: [liveGroup1],
      liveHostelsState: [hostelActive],
      liveStudentsState: [student1, student2],
      activeAllocatedStudentIds: new Set(),
    });

    assert.equal(res.ok, true);
    assert.equal(res.plan.roomIncrements.length, 1);
    assert.equal(res.plan.roomIncrements[0].add, 2);
    assert.equal(res.plan.allocationRecords.length, 2);

    const action = res.plan.groupActions[0];
    assert.equal(action.type, "lock_existing");
    assert.equal(action.groupId, "g1");
  });

  it("2. resolves fill_and_lock, shrink_and_lock, and create_and_lock accurately", () => {
    const student5 = { id: "s5", name: "Student 5", gender: "male", year: 1, isDemo: true, preferences: {} };
    const student6 = { id: "s6", name: "Student 6", gender: "male", year: 1, isDemo: true, preferences: {} };

    const unitFilledDistinct = {
      ...unitFilled,
      members: [student1, student2],
    };
    const unitShrunkDistinct = {
      ...unitShrunk,
      members: [student3, student4],
    };
    const unitPoolDistinct = {
      ...unitPool,
      members: [student5, student6],
    };

    const roomA = { ...roomClean, id: "rA" };
    const roomB = { ...roomClean, id: "rB" };
    const roomC = { ...roomClean, id: "rC" };

    const assignments = [
      { unitId: "u2", unit: unitFilledDistinct, roomId: "rA", hostelId: "h1", status: "assigned" },
      { unitId: "u3", unit: unitShrunkDistinct, roomId: "rB", hostelId: "h1", status: "assigned" },
      { unitId: "u4", unit: unitPoolDistinct, roomId: "rC", hostelId: "h1", status: "assigned" },
    ];

    const res = buildPublishPlan({
      assignments,
      units: [unitFilledDistinct, unitShrunkDistinct, unitPoolDistinct],
      liveRoomsState: [roomA, roomB, roomC],
      liveGroupsState: [liveGroup2, liveGroup3],
      liveHostelsState: [hostelActive],
      liveStudentsState: [student1, student2, student3, student4, student5, student6],
      activeAllocatedStudentIds: new Set(),
    });

    assert.equal(res.ok, true);
    const types = res.plan.groupActions.map((g) => g.type);
    assert.ok(types.includes("fill_and_lock"));
    assert.ok(types.includes("shrink_and_lock"));
    assert.ok(types.includes("create_and_lock"));

    const poolAction = res.plan.groupActions.find((g) => g.type === "create_and_lock");
    assert.equal(poolAction.targetSize, 2);
    assert.equal(poolAction.createdByAllocation, true);
    assert.equal(poolAction.isDemo, true);
  });

  it("3. detects conflict: room_missing", () => {
    const res = buildPublishPlan({
      assignments: [{ unitId: "u1", unit: unitExisting, roomId: "nonExistent", status: "assigned" }],
      units: [unitExisting],
      liveRoomsState: [roomClean],
      liveGroupsState: [liveGroup1],
      liveHostelsState: [hostelActive],
    });
    assert.equal(res.ok, false);
    assert.ok(res.conflicts.some((c) => c.code === "room_missing"));
  });

  it("4. detects conflict: room_not_empty", () => {
    const res = buildPublishPlan({
      assignments: [{ unitId: "u1", unit: unitExisting, roomId: "rOcc", status: "assigned" }],
      units: [unitExisting],
      liveRoomsState: [roomOccupied],
      liveGroupsState: [liveGroup1],
      liveHostelsState: [hostelActive],
    });
    assert.equal(res.ok, false);
    assert.ok(res.conflicts.some((c) => c.code === "room_not_empty"));
  });

  it("5. detects conflict: room_in_maintenance", () => {
    const res = buildPublishPlan({
      assignments: [{ unitId: "u1", unit: unitExisting, roomId: "rMaint", status: "assigned" }],
      units: [unitExisting],
      liveRoomsState: [roomMaint],
      liveGroupsState: [liveGroup1],
      liveHostelsState: [hostelActive],
    });
    assert.equal(res.ok, false);
    assert.ok(res.conflicts.some((c) => c.code === "room_in_maintenance"));
  });

  it("6. detects conflict: capacity_mismatch", () => {
    const res = buildPublishPlan({
      assignments: [{ unitId: "u1", unit: unitExisting, roomId: "rCap3", status: "assigned" }],
      units: [unitExisting],
      liveRoomsState: [roomCapacity3],
      liveGroupsState: [liveGroup1],
      liveHostelsState: [hostelActive],
    });
    assert.equal(res.ok, false);
    assert.ok(res.conflicts.some((c) => c.code === "capacity_mismatch"));
  });

  it("7. detects conflict: student_already_allocated", () => {
    const res = buildPublishPlan({
      assignments: [{ unitId: "u1", unit: unitExisting, roomId: "r1", status: "assigned" }],
      units: [unitExisting],
      liveRoomsState: [roomClean],
      liveGroupsState: [liveGroup1],
      liveHostelsState: [hostelActive],
      activeAllocatedStudentIds: new Set(["s1"]),
    });
    assert.equal(res.ok, false);
    assert.ok(res.conflicts.some((c) => c.code === "student_already_allocated"));
  });

  it("8. detects conflict: hostel_inactive and hard_constraint_violated", () => {
    const roomInact = { ...roomClean, hostelId: "hInact" };
    const resInact = buildPublishPlan({
      assignments: [{ unitId: "u1", unit: unitExisting, roomId: "r1", hostelId: "hInact", status: "assigned" }],
      units: [unitExisting],
      liveRoomsState: [roomInact],
      liveGroupsState: [liveGroup1],
      liveHostelsState: [hostelInactive],
    });
    assert.equal(resInact.ok, false);
    assert.ok(resInact.conflicts.some((c) => c.code === "hostel_inactive"));

    const roomYear = { ...roomClean, hostelId: "hYear" };
    const resYear = buildPublishPlan({
      assignments: [{ unitId: "u1", unit: unitExisting, roomId: "r1", hostelId: "hYear", status: "assigned" }],
      units: [unitExisting],
      liveRoomsState: [roomYear],
      liveGroupsState: [liveGroup1],
      liveHostelsState: [hostelYearBlocked],
    });
    assert.equal(resYear.ok, false);
    assert.ok(resYear.conflicts.some((c) => c.code === "hard_constraint_violated"));
  });

  it("9. detects conflict: group_changed", () => {
    const disbandedGroup = { id: "g1", status: "disbanded", members: [] };
    const res = buildPublishPlan({
      assignments: [{ unitId: "u1", unit: unitExisting, roomId: "r1", status: "assigned" }],
      units: [unitExisting],
      liveRoomsState: [roomClean],
      liveGroupsState: [disbandedGroup],
      liveHostelsState: [hostelActive],
    });
    assert.equal(res.ok, false);
    assert.ok(res.conflicts.some((c) => c.code === "group_changed"));
  });

  it("10. detects conflict: student_inactive", () => {
    const inactiveStudent = { ...student1, isActive: false };
    const res = buildPublishPlan({
      assignments: [{ unitId: "u1", unit: unitExisting, roomId: "r1", status: "assigned" }],
      units: [unitExisting],
      liveRoomsState: [roomClean],
      liveGroupsState: [liveGroup1],
      liveHostelsState: [hostelActive],
      liveStudentsState: [inactiveStudent, student2],
    });
    assert.equal(res.ok, false);
    assert.ok(res.conflicts.some((c) => c.code === "student_inactive"));
  });
});
