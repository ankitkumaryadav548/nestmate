import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  effectiveWindowStatus,
  validateWindowInput,
  msUntil,
  countdownInfo,
} from "./windowStatus.js";

import {
  nextRoomState,
  canClaimRoom,
  canJoinRoomedGroup,
  satisfiesAcDealBreaker,
} from "./roomState.js";

import {
  canStudentSelect,
  canReleaseRoom,
} from "./selectionRules.js";

import {
  annotateRoomsForUnit,
  compareRoomNumbers,
} from "./roomBrowser.js";

import {
  planOpenSeatFilling,
} from "./openSeatFilling.js";

describe("Selection Pure Modules Test Suite", () => {
  // --------------------------------------------------------------------------
  // 1. WINDOW STATUS & INPUT VALIDATION
  // --------------------------------------------------------------------------
  describe("Window Status Transitions & Validation", () => {
    it("computes all status transitions correctly", () => {
      const baseNow = new Date("2026-11-01T10:00:00Z");

      // Scheduled (starts in future)
      const scheduledWindow = {
        startsAt: new Date("2026-11-01T11:00:00Z"),
        endsAt: new Date("2026-11-01T12:00:00Z"),
      };
      assert.equal(effectiveWindowStatus(scheduledWindow, baseNow), "scheduled");

      // Open (currently active)
      const openWindow = {
        startsAt: new Date("2026-11-01T09:00:00Z"),
        endsAt: new Date("2026-11-01T11:00:00Z"),
      };
      assert.equal(effectiveWindowStatus(openWindow, baseNow), "open");

      // Closed (natural expiration)
      const expiredWindow = {
        startsAt: new Date("2026-11-01T08:00:00Z"),
        endsAt: new Date("2026-11-01T09:30:00Z"),
      };
      assert.equal(effectiveWindowStatus(expiredWindow, baseNow), "closed");

      // Closed early (manual close)
      const closedEarly = {
        startsAt: new Date("2026-11-01T09:00:00Z"),
        endsAt: new Date("2026-11-01T12:00:00Z"),
        closedAt: new Date("2026-11-01T09:45:00Z"),
      };
      assert.equal(effectiveWindowStatus(closedEarly, baseNow), "closed");

      // Finalized (takes precedence over all)
      const finalizedWindow = {
        startsAt: new Date("2026-11-01T09:00:00Z"),
        endsAt: new Date("2026-11-01T12:00:00Z"),
        finalizedAt: new Date("2026-11-01T09:50:00Z"),
      };
      assert.equal(effectiveWindowStatus(finalizedWindow, baseNow), "finalized");

      // Null window
      assert.equal(effectiveWindowStatus(null, baseNow), null);
    });

    it("validates window inputs properly", () => {
      const now = new Date("2026-11-01T10:00:00Z");

      // Valid: ends in future, duration >= 5 mins
      const valid = validateWindowInput(
        {
          startsAt: new Date("2026-11-01T10:10:00Z"),
          endsAt: new Date("2026-11-01T10:30:00Z"),
        },
        now
      );
      assert.equal(valid.valid, true);

      // Invalid: ends in the past
      const pastEnd = validateWindowInput(
        {
          startsAt: new Date("2026-11-01T08:00:00Z"),
          endsAt: new Date("2026-11-01T09:00:00Z"),
        },
        now
      );
      assert.equal(pastEnd.valid, false);

      // Invalid: duration less than MIN_WINDOW_MINUTES (5 min)
      const tooShort = validateWindowInput(
        {
          startsAt: new Date("2026-11-01T10:10:00Z"),
          endsAt: new Date("2026-11-01T10:13:00Z"),
        },
        now
      );
      assert.equal(tooShort.valid, false);

      // Invalid: missing fields or corrupt dates
      assert.equal(validateWindowInput({ startsAt: null, endsAt: null }, now).valid, false);
      assert.equal(validateWindowInput({ startsAt: "invalid", endsAt: "date" }, now).valid, false);
    });

    it("calculates countdown info accurately", () => {
      const now = new Date("2026-11-01T10:00:00Z");
      const win = {
        startsAt: new Date("2026-11-01T09:30:00Z"),
        endsAt: new Date("2026-11-01T10:30:00Z"),
      };
      const info = countdownInfo(win, now);
      assert.equal(info.status, "open");
      assert.equal(info.secondsLeft, 1800); // 30 minutes left = 1800s
    });
  });

  // --------------------------------------------------------------------------
  // 2. ROOM STATE DERIVATION & CLAIM ELIGIBILITY
  // --------------------------------------------------------------------------
  describe("Room State & Claim Invariants", () => {
    it("derives nextRoomState for all permutations", () => {
      // Maintenance overrides all
      assert.equal(nextRoomState({ capacity: 2, occupancy: 0, inMaintenance: true }), "maintenance");
      assert.equal(nextRoomState({ capacity: 2, occupancy: 2, inMaintenance: true }), "maintenance");

      // Full when occupancy >= capacity
      assert.equal(nextRoomState({ capacity: 2, occupancy: 2 }), "full");
      assert.equal(nextRoomState({ capacity: 3, occupancy: 4 }), "full");

      // Claimed when hasClaim is true and occupancy < capacity
      assert.equal(nextRoomState({ capacity: 2, occupancy: 1, hasClaim: true }), "claimed");
      assert.equal(nextRoomState({ capacity: 3, occupancy: 0, hasClaim: true }), "claimed");

      // Available when occupancy < capacity and no claim
      assert.equal(nextRoomState({ capacity: 2, occupancy: 0, hasClaim: false }), "available");
    });

    it("canClaimRoom rejects invalid or conflicting rooms", () => {
      const hostel = {
        _id: "hostel1",
        gender: "boys",
        isActive: true,
        allowedYears: [1, 2, 3],
        totalFloors: 3,
      };

      const unit = {
        size: 2,
        members: [
          {
            id: "m1",
            gender: "male",
            year: 2,
            preferences: { dealBreakers: [], acPreference: "no-preference" },
          },
          {
            id: "m2",
            gender: "male",
            year: 3,
            preferences: { dealBreakers: ["acType"], acPreference: "ac" },
          },
        ],
      };

      const validRoom = {
        _id: "r1",
        status: "available",
        capacity: 2,
        currentOccupancy: 0,
        roomType: "AC",
        claim: null,
      };

      // Success case
      assert.equal(canClaimRoom(validRoom, hostel, unit).ok, true);

      // Rejection: room taken / claimed
      const claimedRoom = { ...validRoom, claim: { group: "grpX" } };
      assert.equal(canClaimRoom(claimedRoom, hostel, unit).code, "ROOM_TAKEN");

      // Rejection: occupancy > 0
      const occupiedRoom = { ...validRoom, currentOccupancy: 1 };
      assert.equal(canClaimRoom(occupiedRoom, hostel, unit).code, "ROOM_TAKEN");

      // Rejection: maintenance
      const maintRoom = { ...validRoom, status: "maintenance" };
      assert.equal(canClaimRoom(maintRoom, hostel, unit).code, "ROOM_NOT_VALID");

      // Rejection: capacity mismatch
      const wrongCapRoom = { ...validRoom, capacity: 3 };
      assert.equal(canClaimRoom(wrongCapRoom, hostel, unit).code, "ROOM_NOT_VALID");

      // Rejection: inactive hostel
      const inactiveHostel = { ...hostel, isActive: false };
      assert.equal(canClaimRoom(validRoom, inactiveHostel, unit).code, "ROOM_NOT_VALID");

      // Rejection: hostel gender mismatch
      const girlsHostel = { ...hostel, gender: "girls" };
      assert.equal(canClaimRoom(validRoom, girlsHostel, unit).code, "ROOM_NOT_VALID");

      // Rejection: member academic year not allowed
      const seniorHostel = { ...hostel, allowedYears: [4] };
      assert.equal(canClaimRoom(validRoom, seniorHostel, unit).code, "ROOM_NOT_VALID");

      // Rejection: hard AC deal-breaker violation (m2 requires AC, but room is Non-AC)
      const nonAcRoom = { ...validRoom, roomType: "Non-AC" };
      const acCheck = canClaimRoom(nonAcRoom, hostel, unit);
      assert.equal(acCheck.ok, false);
      assert.equal(acCheck.code, "ROOM_NOT_VALID");
    });

    it("canJoinRoomedGroup validates candidate constraints", () => {
      const hostel = {
        gender: "girls",
        isActive: true,
        allowedYears: [1, 2],
      };
      const room = { roomType: "AC" };

      // Valid candidate
      const validCandidate = {
        gender: "female",
        year: 1,
        preferences: { dealBreakers: [], acPreference: "no-preference" },
      };
      assert.equal(canJoinRoomedGroup(validCandidate, room, hostel).ok, true);

      // Wrong gender candidate
      const maleCandidate = { ...validCandidate, gender: "male" };
      assert.equal(canJoinRoomedGroup(maleCandidate, room, hostel).ok, false);

      // Wrong year candidate
      const seniorCandidate = { ...validCandidate, year: 3 };
      assert.equal(canJoinRoomedGroup(seniorCandidate, room, hostel).ok, false);

      // AC deal-breaker violation (requires Non-AC, room is AC)
      const nonAcOnlyCandidate = {
        ...validCandidate,
        preferences: { dealBreakers: ["acType"], acPreference: "non-ac" },
      };
      assert.equal(canJoinRoomedGroup(nonAcOnlyCandidate, room, hostel).ok, false);
    });
  });

  // --------------------------------------------------------------------------
  // 3. SELECTION & RELEASE RULES
  // --------------------------------------------------------------------------
  describe("Selection & Release Eligibility Rules", () => {
    it("canStudentSelect validates window, allocation, preferences, and roles", () => {
      const student1 = { id: "s1", roomSize: 1 };
      const student2 = { id: "s2", roomSize: 2 };

      // 1. Window not open
      const notOpen = canStudentSelect({
        student: student1,
        preferencesCompleted: true,
        windowStatus: "scheduled",
      });
      assert.equal(notOpen.allowed, false);
      assert.equal(notOpen.code, "WINDOW_NOT_OPEN");

      // 2. Already allocated
      const alreadyAlloc = canStudentSelect({
        student: student1,
        hasActiveAllocation: true,
        preferencesCompleted: true,
        windowStatus: "open",
      });
      assert.equal(alreadyAlloc.allowed, false);
      assert.equal(alreadyAlloc.code, "ALREADY_HAS_ROOM");

      // 3. Incomplete preferences
      const incomplete = canStudentSelect({
        student: student1,
        preferencesCompleted: false,
        windowStatus: "open",
      });
      assert.equal(incomplete.allowed, false);
      assert.equal(incomplete.code, "PREFERENCES_INCOMPLETE");

      // 4. Single-room student: mode single, allowed
      const singleAllowed = canStudentSelect({
        student: student1,
        preferencesCompleted: true,
        windowStatus: "open",
      });
      assert.equal(singleAllowed.allowed, true);
      assert.equal(singleAllowed.mode, "single");

      // 5. Shared room student with no group: GROUP_REQUIRED
      const noGroup = canStudentSelect({
        student: student2,
        preferencesCompleted: true,
        windowStatus: "open",
        group: null,
      });
      assert.equal(noGroup.allowed, false);
      assert.equal(noGroup.code, "GROUP_REQUIRED");

      // 6. Shared room student who is NOT leader: NOT_LEADER
      const notLeader = canStudentSelect({
        student: student2,
        preferencesCompleted: true,
        windowStatus: "open",
        group: {
          id: "g1",
          leader: "otherStudent",
          targetSize: 2,
          status: "forming",
          myRole: "member",
        },
      });
      assert.equal(notLeader.allowed, false);
      assert.equal(notLeader.code, "NOT_LEADER");

      // 7. Group already has selectedRoom: ALREADY_HAS_ROOM
      const groupWithRoom = canStudentSelect({
        student: student2,
        preferencesCompleted: true,
        windowStatus: "open",
        group: {
          id: "g1",
          leader: "s2",
          targetSize: 2,
          status: "forming",
          selectedRoom: "room123",
          myRole: "leader",
        },
      });
      assert.equal(groupWithRoom.allowed, false);
      assert.equal(groupWithRoom.code, "ALREADY_HAS_ROOM");

      // 8. Leader of forming group with matching size: allowed
      const leaderOk = canStudentSelect({
        student: student2,
        preferencesCompleted: true,
        windowStatus: "open",
        group: {
          id: "g1",
          leader: "s2",
          targetSize: 2,
          status: "forming",
          selectedRoom: null,
          myRole: "leader",
        },
      });
      assert.equal(leaderOk.allowed, true);
      assert.equal(leaderOk.mode, "group");
    });

    it("canReleaseRoom enforces window status and leader authority", () => {
      // Releasing when window is closed is blocked
      const closed = canReleaseRoom({
        windowStatus: "closed",
        isLeader: true,
        group: { selectedRoom: "r1" },
      });
      assert.equal(closed.allowed, false);
      assert.equal(closed.code, "WINDOW_CLOSED_RELEASE_BLOCKED");

      // Non-leader member cannot release
      const nonLeader = canReleaseRoom({
        windowStatus: "open",
        isLeader: false,
        group: { selectedRoom: "r1" },
      });
      assert.equal(nonLeader.allowed, false);
      assert.equal(nonLeader.code, "NOT_LEADER");

      // Leader can release while open
      const leaderOk = canReleaseRoom({
        windowStatus: "open",
        isLeader: true,
        group: { selectedRoom: "r1" },
      });
      assert.equal(leaderOk.allowed, true);

      // Single-room student can release while open
      const singleOk = canReleaseRoom({
        windowStatus: "open",
        isSingle: true,
      });
      assert.equal(singleOk.allowed, true);
    });
  });

  // --------------------------------------------------------------------------
  // 4. ROOM BROWSER ANNOTATIONS & PRIVACY
  // --------------------------------------------------------------------------
  describe("Room Browser Annotation & Ranking", () => {
    it("annotates valid rooms, tracks soft mismatches, and excludes invalid rooms", () => {
      const hostelA = {
        _id: "hA",
        name: "Tagore Hall",
        code: "TH",
        gender: "boys",
        isActive: true,
        totalFloors: 3,
      };

      const hostelB = {
        _id: "hB",
        name: "Raman Hall",
        code: "RH",
        gender: "boys",
        isActive: true,
        totalFloors: 3,
      };

      const unit = {
        size: 2,
        members: [{ id: "u1", gender: "male", preferences: {} }],
        roomPreferences: {
          preferredHostels: ["hA", "hB"],
          acType: "ac",
          floorPreference: "low",
        },
      };

      const rooms = [
        // Room 1: Hostel A, AC, Floor 0 (low) -> 1st choice, full points
        { _id: "r1", hostel: "hA", roomNumber: "101", floor: 0, capacity: 2, roomType: "AC", status: "available" },
        // Room 2: Hostel A, Non-AC, Floor 0 (low) -> soft mismatch AC
        { _id: "r2", hostel: "hA", roomNumber: "102", floor: 0, capacity: 2, roomType: "Non-AC", status: "available" },
        // Room 3: Hostel B, AC, Floor 2 (high) -> 2nd choice hostel, soft mismatch floor
        { _id: "r3", hostel: "hB", roomNumber: "201", floor: 2, capacity: 2, roomType: "AC", status: "available" },
        // Room 4: Capacity 3 -> should be excluded by canClaimRoom
        { _id: "r4", hostel: "hA", roomNumber: "301", floor: 0, capacity: 3, roomType: "AC", status: "available" },
      ];

      const annotated = annotateRoomsForUnit(rooms, [hostelA, hostelB], unit);

      // Room 4 (wrong capacity) must be excluded
      assert.equal(annotated.length, 3);

      // Best match (Room 1) should be first
      assert.equal(annotated[0].id, "r1");
      assert.equal(annotated[0].hostelRank, 1);
      assert.equal(annotated[0].acMatch, true);
      assert.equal(annotated[0].floorMatch, true);
      assert.equal(annotated[0].softMismatches.length, 0);

      // Room 2 has soft mismatch for AC
      const r2 = annotated.find((r) => r.id === "r2");
      assert.ok(r2.softMismatches.some((m) => m.includes("Non-AC")));

      // Privacy: verify no occupant array exists
      annotated.forEach((r) => {
        assert.equal(r.occupants, undefined);
        assert.equal(r.members, undefined);
      });
    });

    it("sorts room numbers naturally", () => {
      assert.ok(compareRoomNumbers("2", "10") < 0);
      assert.ok(compareRoomNumbers("101", "102") < 0);
      assert.ok(compareRoomNumbers("102", "102") === 0);
    });
  });

  // --------------------------------------------------------------------------
  // 5. OPEN-SEAT AUTO-FILL PLANNING
  // --------------------------------------------------------------------------
  describe("Open-Seat Auto-Fill Planning Engine", () => {
    it("fills open seats with compatible candidates deterministically without deal-breaker violations", () => {
      const hostel = {
        _id: "hostelX",
        gender: "boys",
        isActive: true,
        allowedYears: [1, 2, 3],
      };

      const room = {
        _id: "roomX",
        hostel: "hostelX",
        capacity: 3,
        roomType: "Non-AC",
      };

      const groupA = {
        id: "grpA",
        gender: "male",
        targetSize: 3,
        openSeats: 2,
        roomClaimedAt: new Date("2026-11-01T09:00:00Z"),
        selectedRoom: room,
        hostel,
        members: [
          {
            id: "mLeader",
            gender: "male",
            year: 2,
            preferences: {
              foodType: "veg",
              dealBreakers: ["food"], // Must share same food type
              cleanliness: 4,
              socialLevel: 2,
              sleepSchedule: "normal",
              languages: ["English"],
            },
          },
        ],
      };

      const poolStudents = [
        // Candidate 1: Incompatible! Non-veg violates mLeader's food deal-breaker
        {
          id: "cand1",
          gender: "male",
          roomSize: 3,
          year: 2,
          preferences: {
            foodType: "non-veg",
            dealBreakers: [],
            cleanliness: 4,
            socialLevel: 2,
            sleepSchedule: "normal",
            languages: ["English"],
          },
        },
        // Candidate 2: Incompatible gender (female)
        {
          id: "cand2",
          gender: "female",
          roomSize: 3,
          year: 2,
          preferences: {
            foodType: "veg",
            dealBreakers: [],
            cleanliness: 4,
            socialLevel: 2,
            sleepSchedule: "normal",
            languages: ["English"],
          },
        },
        // Candidate 3: Incompatible roomSize (2 instead of 3)
        {
          id: "cand3",
          gender: "male",
          roomSize: 2,
          year: 2,
          preferences: {
            foodType: "veg",
            dealBreakers: [],
            cleanliness: 4,
            socialLevel: 2,
            sleepSchedule: "normal",
            languages: ["English"],
          },
        },
        // Candidate 4: Perfect match! Veg, male, size 3
        {
          id: "cand4",
          gender: "male",
          roomSize: 3,
          year: 2,
          preferences: {
            foodType: "veg",
            dealBreakers: [],
            cleanliness: 4,
            socialLevel: 2,
            sleepSchedule: "normal",
            languages: ["English"],
          },
        },
        // Candidate 5: Good match! Veg, male, size 3
        {
          id: "cand5",
          gender: "male",
          roomSize: 3,
          year: 2,
          preferences: {
            foodType: "veg",
            dealBreakers: [],
            cleanliness: 3,
            socialLevel: 3,
            sleepSchedule: "normal",
            languages: ["English"],
          },
        },
      ];

      const result = planOpenSeatFilling({
        roomedGroups: [groupA],
        poolStudents,
        rooms: [room],
        hostels: [hostel],
      });

      // Group A had 2 open seats. Candidates 4 & 5 should be added.
      // Candidate 1 (violates deal-breaker), Candidate 2 (wrong gender), and Candidate 3 (wrong roomSize) must be skipped.
      assert.equal(result.additions.length, 2);
      const addedIds = result.additions.map((a) => a.studentId);
      assert.ok(addedIds.includes("cand4"));
      assert.ok(addedIds.includes("cand5"));
      assert.ok(!addedIds.includes("cand1"));
      assert.ok(!addedIds.includes("cand2"));
      assert.ok(!addedIds.includes("cand3"));

      // Seats still open should be 0
      const openForGrpA = result.seatsStillOpen.find((s) => s.groupId === "grpA");
      assert.equal(openForGrpA, undefined);
    });
  });
});

