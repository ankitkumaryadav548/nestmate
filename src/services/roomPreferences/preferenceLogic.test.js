import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  floorMatchesBand,
  isHostelEligibleForGroup,
  resolveAcConflict,
  suggestDefaultAcType,
  normalizePreferences,
} from "./preferenceLogic.js";

describe("Room Preferences Pure Logic Tests", () => {
  describe("1. Floor Band Matching Relative to Total Floors", () => {
    test("Band 'any' matches every valid floor across any building height", () => {
      assert.equal(floorMatchesBand(0, 4, "any"), true);
      assert.equal(floorMatchesBand(3, 4, "any"), true);
      assert.equal(floorMatchesBand(5, 6, "any"), true);
      // Invalid floor bounds return false
      assert.equal(floorMatchesBand(4, 4, "any"), false);
      assert.equal(floorMatchesBand(-1, 4, "any"), false);
    });

    test("Hostel with 1 floor (floor 0): matches low, mid, high, and any", () => {
      assert.equal(floorMatchesBand(0, 1, "low"), true);
      assert.equal(floorMatchesBand(0, 1, "mid"), true);
      assert.equal(floorMatchesBand(0, 1, "high"), true);
      assert.equal(floorMatchesBand(0, 1, "any"), true);
      assert.equal(floorMatchesBand(1, 1, "low"), false);
    });

    test("Hostel with 2 floors (floors 0 and 1): 0 is low, 1 is high, mid matches both", () => {
      assert.equal(floorMatchesBand(0, 2, "low"), true);
      assert.equal(floorMatchesBand(1, 2, "low"), false);

      assert.equal(floorMatchesBand(1, 2, "high"), true);
      assert.equal(floorMatchesBand(0, 2, "high"), false);

      assert.equal(floorMatchesBand(0, 2, "mid"), true);
      assert.equal(floorMatchesBand(1, 2, "mid"), true);
    });

    test("Hostel with 4 floors (floors 0, 1, 2, 3): 0 is low, 1-2 is mid, 3 is high", () => {
      // low = [0]
      assert.equal(floorMatchesBand(0, 4, "low"), true);
      assert.equal(floorMatchesBand(1, 4, "low"), false);

      // mid = [1, 2]
      assert.equal(floorMatchesBand(0, 4, "mid"), false);
      assert.equal(floorMatchesBand(1, 4, "mid"), true);
      assert.equal(floorMatchesBand(2, 4, "mid"), true);
      assert.equal(floorMatchesBand(3, 4, "mid"), false);

      // high = [3]
      assert.equal(floorMatchesBand(2, 4, "high"), false);
      assert.equal(floorMatchesBand(3, 4, "high"), true);
    });

    test("Hostel with 6 floors (floors 0 to 5): 0-1 is low, 2-3 is mid, 4-5 is high", () => {
      // low = [0, 1]
      assert.equal(floorMatchesBand(0, 6, "low"), true);
      assert.equal(floorMatchesBand(1, 6, "low"), true);
      assert.equal(floorMatchesBand(2, 6, "low"), false);

      // mid = [2, 3]
      assert.equal(floorMatchesBand(1, 6, "mid"), false);
      assert.equal(floorMatchesBand(2, 6, "mid"), true);
      assert.equal(floorMatchesBand(3, 6, "mid"), true);
      assert.equal(floorMatchesBand(4, 6, "mid"), false);

      // high = [4, 5]
      assert.equal(floorMatchesBand(3, 6, "high"), false);
      assert.equal(floorMatchesBand(4, 6, "high"), true);
      assert.equal(floorMatchesBand(5, 6, "high"), true);
    });
  });

  describe("2. Hostel Eligibility for Groups (Gender, Year & Active State)", () => {
    test("Inactive hostel is rejected with reason 'inactive'", () => {
      const hostel = { gender: "boys", isActive: false, allowedYears: [] };
      const members = [{ gender: "male", year: 1 }];
      const res = isHostelEligibleForGroup(hostel, members);
      assert.equal(res.eligible, false);
      assert.equal(res.reason, "inactive");
    });

    test("Gender compatibility: male group cannot enter girls hostel", () => {
      const hostel = { gender: "girls", isActive: true, allowedYears: [] };
      const members = [{ gender: "male", year: 1 }];
      const res = isHostelEligibleForGroup(hostel, members);
      assert.equal(res.eligible, false);
      assert.equal(res.reason, "gender");
    });

    test("Gender compatibility: mixed hostel accepts both male and female groups", () => {
      const mixedHostel = { gender: "mixed", isActive: true, allowedYears: [] };
      const males = [{ gender: "male", year: 1 }, { gender: "male", year: 2 }];
      const females = [{ gender: "female", year: 3 }];
      assert.equal(isHostelEligibleForGroup(mixedHostel, males).eligible, true);
      assert.equal(isHostelEligibleForGroup(mixedHostel, females).eligible, true);
    });

    test("Year restrictions: hostel requiring year [2, 3] rejects group with year 1 member", () => {
      const hostel = { gender: "boys", isActive: true, allowedYears: [2, 3] };
      const members = [
        { gender: "male", year: 2 },
        { gender: "male", year: 1 }, // Ineligible year
      ];
      const res = isHostelEligibleForGroup(hostel, members);
      assert.equal(res.eligible, false);
      assert.equal(res.reason, "year");
    });

    test("Year restrictions: hostel requiring year [1, 2] accepts group when all members qualify", () => {
      const hostel = { gender: "boys", isActive: true, allowedYears: [1, 2] };
      const members = [
        { gender: "male", year: 1 },
        { gender: "male", year: 2 },
      ];
      const res = isHostelEligibleForGroup(hostel, members);
      assert.equal(res.eligible, true);
      assert.equal(res.reason, null);
    });

    test("Empty allowedYears means all academic years are eligible", () => {
      const hostel = { gender: "boys", isActive: true, allowedYears: [] };
      const members = [
        { gender: "male", year: 1 },
        { gender: "male", year: 4 },
      ];
      assert.equal(isHostelEligibleForGroup(hostel, members).eligible, true);
    });
  });

  describe("3. AC Deal-Breaker Conflict Resolution", () => {
    test("No conflict when group selects 'no-preference'", () => {
      const members = [
        { preferences: { acPreference: "ac", dealBreakers: ["acType"] } },
      ];
      const res = resolveAcConflict("no-preference", members);
      assert.equal(res.conflict, false);
      assert.equal(res.memberIndexes.length, 0);
    });

    test("No conflict when group matches member's deal-breaker preference", () => {
      const members = [
        { preferences: { acPreference: "ac", dealBreakers: ["acType"] } },
        { preferences: { acPreference: "ac", dealBreakers: [] } },
      ];
      const res = resolveAcConflict("ac", members);
      assert.equal(res.conflict, false);
    });

    test("Conflict detected when member needs 'ac' with dealBreaker but group chose 'non-ac'", () => {
      const members = [
        { preferences: { acPreference: "ac", dealBreakers: ["acType"] } },
        { preferences: { acPreference: "non-ac", dealBreakers: [] } },
      ];
      const res = resolveAcConflict("non-ac", members);
      assert.equal(res.conflict, true);
      assert.deepEqual(res.memberIndexes, [0]);
    });

    test("Conflict detected when member needs 'non-ac' with dealBreaker but group chose 'ac'", () => {
      const members = [
        { preferences: { acPreference: "no-preference", dealBreakers: [] } },
        { preferences: { acPreference: "non-ac", dealBreakers: ["acType"] } },
      ];
      const res = resolveAcConflict("ac", members);
      assert.equal(res.conflict, true);
      assert.deepEqual(res.memberIndexes, [1]);
    });

    test("No conflict if member differs in preference but does NOT have acType deal-breaker", () => {
      const members = [
        { preferences: { acPreference: "ac", dealBreakers: [] } }, // Soft preference only
      ];
      const res = resolveAcConflict("non-ac", members);
      assert.equal(res.conflict, false);
    });
  });

  describe("4. Default AC Type Suggestion", () => {
    test("Suggests 'ac' when all non-neutral members prefer AC", () => {
      const members = [
        { preferences: { acPreference: "ac" } },
        { preferences: { acPreference: "no-preference" } },
      ];
      assert.equal(suggestDefaultAcType(members), "ac");
    });

    test("Suggests 'non-ac' when all non-neutral members prefer Non-AC", () => {
      const members = [
        { preferences: { acPreference: "non-ac" } },
        { preferences: { acPreference: "non-ac" } },
      ];
      assert.equal(suggestDefaultAcType(members), "non-ac");
    });

    test("Suggests 'no-preference' when members disagree on AC choice", () => {
      const members = [
        { preferences: { acPreference: "ac" } },
        { preferences: { acPreference: "non-ac" } },
      ];
      assert.equal(suggestDefaultAcType(members), "no-preference");
    });

    test("Suggests 'no-preference' when all members are flexible or empty", () => {
      const members = [
        { preferences: { acPreference: "no-preference" } },
      ];
      assert.equal(suggestDefaultAcType(members), "no-preference");
      assert.equal(suggestDefaultAcType([]), "no-preference");
    });
  });

  describe("5. Preference Normalization & Duplicate Removal", () => {
    test("Preserves order, removes duplicate hostels, and limits to 3", () => {
      const input = {
        preferredHostels: ["hostelA", "hostelB", "hostelA", "hostelC", "hostelD"],
        acType: "ac",
        floorPreference: "high",
      };
      const res = normalizePreferences(input);
      assert.deepEqual(res.preferredHostels, ["hostelA", "hostelB", "hostelC"]);
      assert.equal(res.acType, "ac");
      assert.equal(res.floorPreference, "high");
    });

    test("Falls back to defaults for invalid acType or floorPreference", () => {
      const input = {
        preferredHostels: ["  hostel1  "],
        acType: "invalid-type",
        floorPreference: "super-high",
      };
      const res = normalizePreferences(input);
      assert.deepEqual(res.preferredHostels, ["hostel1"]);
      assert.equal(res.acType, "no-preference");
      assert.equal(res.floorPreference, "any");
    });
  });
});
