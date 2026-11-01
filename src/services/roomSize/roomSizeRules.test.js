import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canMatchOnRoomSize,
  needsRoommates,
  validateRoomSizeChange,
  deriveGroupSizeFromLeader,
} from "./roomSizeRules.js";

describe("canMatchOnRoomSize", () => {
  it("returns true for matching room sizes 2, 3, 4", () => {
    assert.strictEqual(canMatchOnRoomSize({ roomSize: 2 }, { roomSize: 2 }), true);
    assert.strictEqual(canMatchOnRoomSize({ roomSize: 3 }, { roomSize: 3 }), true);
    assert.strictEqual(canMatchOnRoomSize({ roomSize: 4 }, { roomSize: 4 }), true);
  });

  it("returns false for size-1 single rooms (no roommates)", () => {
    assert.strictEqual(canMatchOnRoomSize({ roomSize: 1 }, { roomSize: 1 }), false);
  });

  it("returns false for different room sizes", () => {
    assert.strictEqual(canMatchOnRoomSize({ roomSize: 2 }, { roomSize: 3 }), false);
    assert.strictEqual(canMatchOnRoomSize({ roomSize: 2 }, { roomSize: 4 }), false);
    assert.strictEqual(canMatchOnRoomSize({ roomSize: 3 }, { roomSize: 4 }), false);
    assert.strictEqual(canMatchOnRoomSize({ roomSize: 1 }, { roomSize: 2 }), false);
  });

  it("returns false when either object is null or missing roomSize", () => {
    assert.strictEqual(canMatchOnRoomSize(null, { roomSize: 2 }), false);
    assert.strictEqual(canMatchOnRoomSize({ roomSize: 2 }, null), false);
    assert.strictEqual(canMatchOnRoomSize({}, { roomSize: 2 }), false);
    assert.strictEqual(canMatchOnRoomSize({ roomSize: "2" }, { roomSize: "2" }), false);
  });
});

describe("needsRoommates", () => {
  it("returns false for size 1", () => {
    assert.strictEqual(needsRoommates(1), false);
  });

  it("returns true for sizes 2, 3, 4", () => {
    assert.strictEqual(needsRoommates(2), true);
    assert.strictEqual(needsRoommates(3), true);
    assert.strictEqual(needsRoommates(4), true);
  });

  it("returns false for invalid inputs", () => {
    assert.strictEqual(needsRoommates(0), false);
    assert.strictEqual(needsRoommates(5), false);
    assert.strictEqual(needsRoommates(null), false);
  });
});

describe("validateRoomSizeChange", () => {
  it("blocks change when student is in an active group", () => {
    const res = validateRoomSizeChange({
      currentRoomSize: 2,
      newRoomSize: 3,
      inActiveGroup: true,
      hasAllocation: false,
    });
    assert.strictEqual(res.allowed, false);
    assert.match(res.reason, /Leave your group first/i);
  });

  it("blocks change when student has an active allocation", () => {
    const res = validateRoomSizeChange({
      currentRoomSize: 2,
      newRoomSize: 3,
      inActiveGroup: false,
      hasAllocation: true,
    });
    assert.strictEqual(res.allowed, false);
    assert.match(res.reason, /active room allocation/i);
  });

  it("allows change when no group and no allocation", () => {
    const res = validateRoomSizeChange({
      currentRoomSize: 2,
      newRoomSize: 3,
      inActiveGroup: false,
      hasAllocation: false,
    });
    assert.strictEqual(res.allowed, true);
    assert.strictEqual(res.reason, null);
  });
});

describe("deriveGroupSizeFromLeader", () => {
  it("derives targetSize 2, 3, 4 correctly", () => {
    assert.strictEqual(deriveGroupSizeFromLeader(2), 2);
    assert.strictEqual(deriveGroupSizeFromLeader(3), 3);
    assert.strictEqual(deriveGroupSizeFromLeader(4), 4);
  });

  it("throws error for roomSize 1", () => {
    assert.throws(() => deriveGroupSizeFromLeader(1), /Single-room students do not need a group/i);
  });

  it("throws error for invalid roomSize", () => {
    assert.throws(() => deriveGroupSizeFromLeader(5), /Invalid roomSize/i);
  });
});

