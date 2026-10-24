import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildRollbackPlan } from "./rollbackPlan.js";

describe("Allocation Rollback Plan Engine (Pure)", () => {
  const mockSnapshot = {
    allocationIds: ["alloc1", "alloc2"],
    touchedRoomIds: ["r1"],
    modifiedGroups: [
      {
        groupId: "g1",
        previous: {
          members: [{ user: "s1", joinedAt: "2026-10-20" }, { user: "s2", joinedAt: "2026-10-20" }],
          targetSize: 2,
          status: "complete",
          completedAt: "2026-10-20",
          lockedAt: null,
        },
      },
    ],
    createdGroupIds: ["gCreated"],
    intentUserIds: ["s1", "s2"],
  };

  const liveStateClean = {
    isLatestPublishedRun: true,
    rooms: [{ id: "r1", roomNumber: "101", currentOccupancy: 2, capacity: 2, status: "full" }],
    groups: [
      { id: "g1", status: "locked", targetSize: 2, members: [{ user: "s1" }, { user: "s2" }] },
      { id: "gCreated", status: "locked", targetSize: 2, members: [{ user: "s3" }, { user: "s4" }] },
    ],
    allocations: [
      { id: "alloc1", student: "s1", room: "r1", status: "active" },
      { id: "alloc2", student: "s2", room: "r1", status: "active" },
    ],
  };

  it("1. rollback exactly restores the previous group data when clean", () => {
    const res = buildRollbackPlan(mockSnapshot, liveStateClean);
    assert.equal(res.ok, true);

    const plan = res.plan;
    assert.equal(plan.cancelAllocationIds.length, 2);
    assert.equal(plan.disbandGroupIds.length, 1);
    assert.equal(plan.disbandGroupIds[0], "gCreated");

    // Restores modified group
    assert.equal(plan.restoreGroups.length, 1);
    assert.equal(plan.restoreGroups[0].groupId, "g1");
    assert.equal(plan.restoreGroups[0].previous.status, "complete");
    assert.equal(plan.restoreGroups[0].previous.targetSize, 2);

    // Decrements room occupancy
    assert.equal(plan.roomDecrements.length, 1);
    assert.equal(plan.roomDecrements[0].roomId, "r1");
    assert.equal(plan.roomDecrements[0].decrement, 2);
    assert.equal(plan.roomDecrements[0].targetOccupancy, 0);
    assert.equal(plan.roomDecrements[0].newStatus, "available");
  });

  it("2. rollback refuses when not the latest published run", () => {
    const res = buildRollbackPlan(mockSnapshot, { ...liveStateClean, isLatestPublishedRun: false });
    assert.equal(res.ok, false);
    assert.ok(res.conflicts.some((c) => c.code === "not_latest_published_run"));
  });

  it("3. rollback refuses when room occupancy has drifted", () => {
    // Room currentOccupancy is 1, but this run had 2 allocations in it
    const driftedRoom = [{ id: "r1", roomNumber: "101", currentOccupancy: 1, capacity: 2, status: "available" }];
    const res = buildRollbackPlan(mockSnapshot, { ...liveStateClean, rooms: driftedRoom });
    assert.equal(res.ok, false);
    assert.ok(res.conflicts.some((c) => c.code === "room_occupancy_drift"));
  });

  it("4. rollback refuses when allocation was tampered/cancelled", () => {
    const tamperedAllocations = [
      { id: "alloc1", student: "s1", room: "r1", status: "cancelled" },
      { id: "alloc2", student: "s2", room: "r1", status: "active" },
    ];
    const res = buildRollbackPlan(mockSnapshot, { ...liveStateClean, allocations: tamperedAllocations });
    assert.equal(res.ok, false);
    assert.ok(res.conflicts.some((c) => c.code === "allocation_tampered"));
  });

  it("5. rollback refuses when group status has drifted", () => {
    const driftedGroups = [
      { id: "g1", status: "disbanded", targetSize: 2, members: [] }, // drifted from locked
      { id: "gCreated", status: "locked", targetSize: 2, members: [{ user: "s3" }, { user: "s4" }] },
    ];
    const res = buildRollbackPlan(mockSnapshot, { ...liveStateClean, groups: driftedGroups });
    assert.equal(res.ok, false);
    assert.ok(res.conflicts.some((c) => c.code === "group_drift"));
  });
});
