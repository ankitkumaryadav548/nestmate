/**
 * Pure Rollback Plan Generation Engine
 * 
 * Computes the exact reverse operations required to roll back a published allocation run.
 * Detects any state drift since publication and ensures strict data safety.
 * 
 * PURE MODULE: Zero database access, no Mongoose, no "@/ " imports.
 */

/**
 * Builds and validates the rollback execution plan against current live state.
 * 
 * @param {object} publishSnapshot - Stored snapshot from when the run was published
 * @param {object} liveState - Current live state snapshot
 * @param {Array<object>|Map<string, object>} liveState.rooms
 * @param {Array<object>|Map<string, object>} liveState.groups
 * @param {Array<object>|Map<string, object>} liveState.allocations
 * @param {boolean} liveState.isLatestPublishedRun
 * @returns {{ ok: boolean, conflicts?: Array<{ code: string, message: string }>, plan?: object }}
 */
export function buildRollbackPlan(publishSnapshot = {}, liveState = {}) {
  const conflicts = [];

  // 1. Must be the latest published run
  if (!liveState.isLatestPublishedRun) {
    conflicts.push({
      code: "not_latest_published_run",
      message: "Only the latest published allocation run can be rolled back to prevent historical state inconsistency.",
    });
    return { ok: false, conflicts };
  }

  if (!publishSnapshot || typeof publishSnapshot !== "object") {
    conflicts.push({
      code: "snapshot_missing",
      message: "The publication snapshot is missing or corrupted on this allocation run.",
    });
    return { ok: false, conflicts };
  }

  // Map indexes
  const roomMap = new Map();
  if (Array.isArray(liveState.rooms)) {
    for (const r of liveState.rooms) roomMap.set(String(r.id || r._id), r);
  } else if (liveState.rooms instanceof Map) {
    for (const [k, v] of liveState.rooms.entries()) roomMap.set(String(k), v);
  }

  const groupMap = new Map();
  if (Array.isArray(liveState.groups)) {
    for (const g of liveState.groups) groupMap.set(String(g.id || g._id), g);
  } else if (liveState.groups instanceof Map) {
    for (const [k, v] of liveState.groups.entries()) groupMap.set(String(k), v);
  }

  const allocationMap = new Map();
  if (Array.isArray(liveState.allocations)) {
    for (const a of liveState.allocations) allocationMap.set(String(a.id || a._id), a);
  } else if (liveState.allocations instanceof Map) {
    for (const [k, v] of liveState.allocations.entries()) allocationMap.set(String(k), v);
  }

  const allocationIds = (publishSnapshot.allocationIds || []).map(String);
  const touchedRoomIds = (publishSnapshot.touchedRoomIds || []).map(String);
  const modifiedGroups = publishSnapshot.modifiedGroups || [];
  const createdGroupIds = (publishSnapshot.createdGroupIds || []).map(String);
  const intentUserIds = (publishSnapshot.intentUserIds || []).map(String);

  // 2. Verify all allocations belonging to this run
  const activeAllocationsByRoom = new Map(); // roomId -> count

  for (const allocId of allocationIds) {
    const liveAlloc = allocationMap.get(allocId);
    if (!liveAlloc) {
      conflicts.push({
        code: "allocation_tampered",
        message: `Allocation record "${allocId}" is missing from live data.`,
      });
      continue;
    }
    if (liveAlloc.status !== "active") {
      conflicts.push({
        code: "allocation_tampered",
        message: `Allocation record "${allocId}" has drifted to status "${liveAlloc.status}" (expected "active").`,
      });
      continue;
    }

    const roomId = String(liveAlloc.room?._id || liveAlloc.room?.id || liveAlloc.room);
    activeAllocationsByRoom.set(roomId, (activeAllocationsByRoom.get(roomId) || 0) + 1);
  }

  // 3. Verify room occupancy against expected decrements
  const roomDecrements = [];

  for (const roomId of touchedRoomIds) {
    const liveRoom = roomMap.get(roomId);
    if (!liveRoom) {
      conflicts.push({
        code: "room_missing",
        message: `Room "${roomId}" no longer exists in live data.`,
      });
      continue;
    }

    const decrement = activeAllocationsByRoom.get(roomId) || 0;
    const currentOcc = liveRoom.currentOccupancy || 0;

    if (currentOcc < decrement) {
      conflicts.push({
        code: "room_occupancy_drift",
        message: `Room "${liveRoom.roomNumber}" has current occupancy ${currentOcc}, but rollback requires removing ${decrement} occupants.`,
      });
      continue;
    }

    const targetOccupancy = currentOcc - decrement;
    const newStatus = liveRoom.status === "maintenance"
      ? "maintenance"
      : targetOccupancy >= liveRoom.capacity
      ? "full"
      : "available";

    roomDecrements.push({
      roomId,
      decrement,
      targetOccupancy,
      newStatus,
    });
  }

  // 4. Verify modified groups can be cleanly restored
  const restoreGroups = [];

  for (const mod of modifiedGroups) {
    const gId = String(mod.groupId);
    const liveGroup = groupMap.get(gId);
    if (!liveGroup) {
      conflicts.push({
        code: "group_drift",
        message: `Modified group "${gId}" no longer exists in live data.`,
      });
      continue;
    }

    if (liveGroup.status !== "locked") {
      conflicts.push({
        code: "group_drift",
        message: `Group "${gId}" has drifted to status "${liveGroup.status}" (expected "locked").`,
      });
      continue;
    }

    restoreGroups.push({
      groupId: gId,
      previous: mod.previous,
    });
  }

  // 5. Verify created groups can be disbanded
  const disbandGroupIds = [];

  for (const cId of createdGroupIds) {
    const liveGroup = groupMap.get(cId);
    if (!liveGroup) {
      conflicts.push({
        code: "group_drift",
        message: `Auto-created group "${cId}" no longer exists in live data.`,
      });
      continue;
    }

    if (liveGroup.status !== "locked") {
      conflicts.push({
        code: "group_drift",
        message: `Auto-created group "${cId}" has drifted to status "${liveGroup.status}" (expected "locked").`,
      });
      continue;
    }

    disbandGroupIds.push(cId);
  }

  if (conflicts.length > 0) {
    return { ok: false, conflicts };
  }

  return {
    ok: true,
    plan: {
      roomDecrements,
      cancelAllocationIds: allocationIds,
      restoreGroups,
      disbandGroupIds,
      clearIntentUserIds: intentUserIds,
    },
  };
}
