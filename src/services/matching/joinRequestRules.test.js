import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  evaluateJoinFit,
  previewJoinImpact,
  canRequestToJoin,
  shouldAutoCloseRequests,
  isExpired,
} from "./joinRequestRules.js";
import { JOIN_ERROR_CODES } from "../../config/groups.js";

describe("Join Request Pure Rules & Fit Engine", () => {
  const baseStudent = {
    id: "student1",
    name: "Aman",
    gender: "male",
    year: 2,
    roomSize: 2,
    preferences: {
      completedAt: new Date("2026-01-01"),
      roomSize: 2,
      sleepSchedule: "normal",
      studyTime: "night",
      cleanliness: 4,
      noiseTolerance: 3,
      socialLevel: 3,
      foodType: "veg",
      languages: ["English"],
      dealBreakers: [],
    },
  };

  const baseLeader = {
    id: "leader1",
    name: "Rohan",
    gender: "male",
    year: 2,
    roomSize: 2,
    preferences: {
      completedAt: new Date("2026-01-01"),
      roomSize: 2,
      sleepSchedule: "normal",
      studyTime: "night",
      cleanliness: 4,
      noiseTolerance: 3,
      socialLevel: 3,
      foodType: "veg",
      languages: ["English"],
      dealBreakers: [],
    },
  };

  const baseGroup = {
    id: "group1",
    leader: "leader1",
    gender: "male",
    targetSize: 2,
    status: "forming",
    selectedRoom: null,
  };

  describe("canRequestToJoin Order & Validation Codes", () => {
    it("1. blocks when preferences are incomplete", () => {
      const student = { ...baseStudent, preferences: null };
      const res = canRequestToJoin({ student, group: baseGroup, groupMembers: [baseLeader] });
      assert.equal(res.allowed, false);
      assert.equal(res.code, JOIN_ERROR_CODES.PREFERENCES_INCOMPLETE.code);
    });

    it("2. blocks when student already has an active allocation", () => {
      const res = canRequestToJoin({
        student: baseStudent,
        group: baseGroup,
        groupMembers: [baseLeader],
        hasActiveAllocation: true,
      });
      assert.equal(res.allowed, false);
      assert.equal(res.code, JOIN_ERROR_CODES.ALREADY_HAS_ROOM.code);
    });

    it("3. blocks when gender or room size differs (returns generic NOT_COMPATIBLE)", () => {
      // Gender mismatch
      let res = canRequestToJoin({
        student: { ...baseStudent, gender: "female" },
        group: baseGroup,
        groupMembers: [baseLeader],
      });
      assert.equal(res.allowed, false);
      assert.equal(res.code, JOIN_ERROR_CODES.NOT_COMPATIBLE.code);

      // Room size mismatch
      res = canRequestToJoin({
        student: { ...baseStudent, roomSize: 3, preferences: { ...baseStudent.preferences, roomSize: 3 } },
        group: baseGroup,
        groupMembers: [baseLeader],
      });
      assert.equal(res.allowed, false);
      assert.equal(res.code, JOIN_ERROR_CODES.NOT_COMPATIBLE.code);
    });

    it("4. blocks when group is not forming or already full", () => {
      // Group complete
      let res = canRequestToJoin({
        student: baseStudent,
        group: { ...baseGroup, status: "complete" },
        groupMembers: [baseLeader],
      });
      assert.equal(res.allowed, false);
      assert.equal(res.code, JOIN_ERROR_CODES.GROUP_NOT_OPEN.code);

      // Group full
      res = canRequestToJoin({
        student: baseStudent,
        group: baseGroup,
        groupMembers: [baseLeader, { id: "member2", gender: "male" }], // 2 of 2
      });
      assert.equal(res.allowed, false);
      assert.equal(res.code, JOIN_ERROR_CODES.NO_FREE_SEAT.code);
    });

    it("5. validates existing student group: solo leader allowed, others blocked", () => {
      // Same group check
      let res = canRequestToJoin({
        student: baseStudent,
        group: baseGroup,
        groupMembers: [baseLeader],
        studentGroup: { id: "group1", status: "forming", leader: "student1", members: [{ user: "student1" }] },
      });
      assert.equal(res.allowed, false);
      assert.equal(res.code, JOIN_ERROR_CODES.ALREADY_IN_GROUP.code);

      // Solo leader with selectedRoom must release room first
      res = canRequestToJoin({
        student: baseStudent,
        group: baseGroup,
        groupMembers: [baseLeader],
        studentGroup: {
          id: "soloGroup",
          status: "forming",
          leader: "student1",
          selectedRoom: "room123",
          members: [{ user: "student1" }],
        },
      });
      assert.equal(res.allowed, false);
      assert.equal(res.code, JOIN_ERROR_CODES.RELEASE_ROOM_FIRST.code);

      // Leader of group with 2 or more members must leave group first
      res = canRequestToJoin({
        student: baseStudent,
        group: baseGroup,
        groupMembers: [baseLeader],
        studentGroup: {
          id: "multiGroup",
          status: "forming",
          leader: "student1",
          members: [{ user: "student1" }, { user: "otherUser" }],
        },
        studentGroupMembers: [{ id: "student1" }, { id: "otherUser" }],
      });
      assert.equal(res.allowed, false);
      assert.equal(res.code, JOIN_ERROR_CODES.LEAVE_GROUP_FIRST.code);

      // Non-leader member of a group must leave group first
      res = canRequestToJoin({
        student: baseStudent,
        group: baseGroup,
        groupMembers: [baseLeader],
        studentGroup: {
          id: "otherGroup",
          status: "forming",
          leader: "otherLeader",
          members: [{ user: "otherLeader" }, { user: "student1" }],
        },
      });
      assert.equal(res.allowed, false);
      assert.equal(res.code, JOIN_ERROR_CODES.LEAVE_GROUP_FIRST.code);

      // Solo leader without room is ALLOWED to request
      res = canRequestToJoin({
        student: baseStudent,
        group: baseGroup,
        groupMembers: [baseLeader],
        studentGroup: {
          id: "soloGroup",
          status: "forming",
          leader: "student1",
          members: [{ user: "student1" }],
        },
      });
      assert.equal(res.allowed, true);
    });

    it("6. blocks when a pending request already exists for this group", () => {
      const res = canRequestToJoin({
        student: baseStudent,
        group: baseGroup,
        groupMembers: [baseLeader],
        existingPendingForGroup: true,
      });
      assert.equal(res.allowed, false);
      assert.equal(res.code, JOIN_ERROR_CODES.PENDING_EXISTS.code);
    });

    it("7. blocks when a pending invitation from this group already exists", () => {
      const res = canRequestToJoin({
        student: baseStudent,
        group: baseGroup,
        groupMembers: [baseLeader],
        hasPendingInvitationFromGroup: true,
      });
      assert.equal(res.allowed, false);
      assert.equal(res.code, JOIN_ERROR_CODES.INVITATION_EXISTS.code);
    });

    it("8. enforces 24-hour rejection cooldown boundary", () => {
      const now = new Date("2026-11-03T12:00:00Z");

      // 23 hours ago: still in cooldown -> BLOCKED
      let res = canRequestToJoin({
        student: baseStudent,
        group: baseGroup,
        groupMembers: [baseLeader],
        lastRejectedAt: new Date("2026-11-02T13:00:00Z"),
        now,
      });
      assert.equal(res.allowed, false);
      assert.equal(res.code, JOIN_ERROR_CODES.COOLDOWN_ACTIVE.code);

      // 25 hours ago: cooldown expired -> ALLOWED
      res = canRequestToJoin({
        student: baseStudent,
        group: baseGroup,
        groupMembers: [baseLeader],
        lastRejectedAt: new Date("2026-11-02T11:00:00Z"),
        now,
      });
      assert.equal(res.allowed, true);
    });

    it("9, 10, 11. enforces student pending, daily, and group limits", () => {
      // Student pending limit (5)
      let res = canRequestToJoin({
        student: baseStudent,
        group: baseGroup,
        groupMembers: [baseLeader],
        pendingRequestsCount: 5,
      });
      assert.equal(res.allowed, false);
      assert.equal(res.code, JOIN_ERROR_CODES.TOO_MANY_PENDING.code);

      // Daily limit (10)
      res = canRequestToJoin({
        student: baseStudent,
        group: baseGroup,
        groupMembers: [baseLeader],
        requestsToday: 10,
      });
      assert.equal(res.allowed, false);
      assert.equal(res.code, JOIN_ERROR_CODES.DAILY_LIMIT.code);

      // Group pending limit (10)
      res = canRequestToJoin({
        student: baseStudent,
        group: baseGroup,
        groupMembers: [baseLeader],
        groupPendingCount: 10,
      });
      assert.equal(res.allowed, false);
      assert.equal(res.code, JOIN_ERROR_CODES.GROUP_PENDING_LIMIT.code);
    });

    it("12. blocks when lifestyle deal-breaker conflicts with ANY member", () => {
      const vegLeader = {
        id: "vegLeader",
        gender: "male",
        year: 2,
        preferences: {
          foodType: "veg",
          dealBreakers: ["food"],
        },
      };

      const nonVegStudent = {
        ...baseStudent,
        preferences: {
          ...baseStudent.preferences,
          foodType: "non-veg",
        },
      };

      const res = canRequestToJoin({
        student: nonVegStudent,
        group: baseGroup,
        groupMembers: [vegLeader],
      });
      assert.equal(res.allowed, false);
      assert.equal(res.code, JOIN_ERROR_CODES.NOT_COMPATIBLE.code);
      assert.equal(res.reason, JOIN_ERROR_CODES.NOT_COMPATIBLE.message);
    });

    it("13. blocks when roomed group physical constraints fail", () => {
      const res = canRequestToJoin({
        student: baseStudent,
        group: baseGroup,
        groupMembers: [baseLeader],
        roomedGroupCheck: false,
      });
      assert.equal(res.allowed, false);
      assert.equal(res.code, JOIN_ERROR_CODES.NOT_COMPATIBLE.code);
    });
  });

  describe("evaluateJoinFit", () => {
    it("returns perMemberScores and allowed status", () => {
      const fit = evaluateJoinFit(baseStudent, [baseLeader]);
      assert.equal(fit.allowed, true);
      assert.equal(fit.perMemberScores.length, 1);
      assert.equal(fit.perMemberScores[0].memberId, "leader1");
      assert.ok(fit.average >= 60);
    });

    it("blocks if any member triggers a deal-breaker", () => {
      const conflictMember = {
        id: "m2",
        gender: "male",
        preferences: {
          foodType: "non-veg",
          dealBreakers: ["food"],
        },
      };
      const fit = evaluateJoinFit(baseStudent, [baseLeader, conflictMember]);
      assert.equal(fit.allowed, false);
    });
  });

  describe("previewJoinImpact", () => {
    it("handles 1-member group (before is null)", () => {
      const impact = previewJoinImpact([baseLeader], baseStudent);
      assert.equal(impact.before.average, null);
      assert.equal(impact.before.lowest, null);
      assert.ok(typeof impact.after.average === "number");
      assert.equal(impact.delta.average, null);
    });

    it("handles 2-member and 3-member groups with delta computation", () => {
      const member2 = {
        id: "m2",
        gender: "male",
        year: 2,
        preferences: { ...baseLeader.preferences },
      };
      const impact2 = previewJoinImpact([baseLeader, member2], baseStudent);
      assert.ok(typeof impact2.before.average === "number");
      assert.ok(typeof impact2.after.average === "number");
      assert.ok(typeof impact2.delta.average === "number");

      const member3 = {
        id: "m3",
        gender: "male",
        year: 2,
        preferences: { ...baseLeader.preferences },
      };
      const impact3 = previewJoinImpact([baseLeader, member2, member3], baseStudent);
      assert.ok(typeof impact3.before.average === "number");
      assert.ok(typeof impact3.after.average === "number");
      assert.ok(typeof impact3.delta.average === "number");
    });
  });

  describe("shouldAutoCloseRequests & isExpired", () => {
    it("maps close reasons correctly", () => {
      assert.equal(shouldAutoCloseRequests("group_full"), "group_full");
      assert.equal(shouldAutoCloseRequests("group_disbanded"), "group_disbanded");
      assert.equal(shouldAutoCloseRequests("group_locked"), "group_locked");
      assert.equal(shouldAutoCloseRequests("requester_joined_elsewhere"), "requester_joined_elsewhere");
      assert.equal(shouldAutoCloseRequests("expired"), "expired");
      assert.equal(shouldAutoCloseRequests("cancelled_by_admin"), "cancelled_by_admin");
    });

    it("evaluates request expiration accurately", () => {
      const now = new Date("2026-11-03T12:00:00Z");
      assert.equal(isExpired({ status: "approved", expiresAt: new Date("2026-11-01T00:00:00Z") }, now), false);
      assert.equal(isExpired({ status: "pending", expiresAt: new Date("2026-11-04T00:00:00Z") }, now), false);
      assert.equal(isExpired({ status: "pending", expiresAt: new Date("2026-11-02T00:00:00Z") }, now), true);
    });
  });
});

