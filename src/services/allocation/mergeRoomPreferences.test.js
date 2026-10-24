import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mergeRoomPreferences } from "./roomPlacement.js";

describe("Merge Room Preferences Pure Module (Borda Count & Consensus)", () => {
  test("1. Borda count aggregates preferred hostels correctly", () => {
    // Member 1: [BH1 (3pts), BH2 (2pts), BH3 (1pt)]
    // Member 2: [BH2 (3pts), BH1 (2pts), BH4 (1pt)]
    // Totals: BH1 = 5pts, BH2 = 5pts, BH3 = 1pt, BH4 = 1pt
    // Top 3: BH1 and BH2 tie (alphabetical by ID: BH1, BH2), then BH3 and BH4 tie (BH3, BH4) -> [BH1, BH2, BH3]
    const m1 = {
      roomPreferences: {
        preferredHostels: ["BH1", "BH2", "BH3"],
        acType: "no-preference",
        floorPreference: "any",
      },
    };
    const m2 = {
      roomPreferences: {
        preferredHostels: ["BH2", "BH1", "BH4"],
        acType: "no-preference",
        floorPreference: "any",
      },
    };

    const merged = mergeRoomPreferences([m1, m2]);
    assert.deepEqual(merged.preferredHostels, ["BH1", "BH2", "BH3"]);
  });

  test("2. AC type consensus: all agreeing explicit members set the choice", () => {
    const m1 = { roomPreferences: { acType: "ac" } };
    const m2 = { roomPreferences: { acType: "ac" } };
    const m3 = { roomPreferences: { acType: "no-preference" } };

    const merged = mergeRoomPreferences([m1, m2, m3]);
    assert.equal(merged.acType, "ac");

    // Disagreement leads to "no-preference"
    const m4 = { roomPreferences: { acType: "non-ac" } };
    const mergedDisagreement = mergeRoomPreferences([m1, m4]);
    assert.equal(mergedDisagreement.acType, "no-preference");
  });

  test("3. Floor preference picks most common non-any value", () => {
    const m1 = { roomPreferences: { floorPreference: "mid" } };
    const m2 = { roomPreferences: { floorPreference: "mid" } };
    const m3 = { roomPreferences: { floorPreference: "low" } };
    const m4 = { roomPreferences: { floorPreference: "any" } };

    const merged = mergeRoomPreferences([m1, m2, m3, m4]);
    assert.equal(merged.floorPreference, "mid");

    // If all are "any", returns "any"
    const allAny = mergeRoomPreferences([m4, { roomPreferences: { floorPreference: "any" } }]);
    assert.equal(allAny.floorPreference, "any");
  });

  test("4. Members without saved preferences fallback to questionnaire acPreference and floor 'any'", () => {
    const studentWithSurveyOnly = {
      preferences: {
        acPreference: "ac",
      },
    };

    const merged = mergeRoomPreferences([studentWithSurveyOnly]);
    assert.equal(merged.acType, "ac");
    assert.equal(merged.floorPreference, "any");
    assert.deepEqual(merged.preferredHostels, []);
  });
});
