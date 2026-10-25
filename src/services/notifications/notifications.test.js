import test from "node:test";
import assert from "node:assert/strict";
import { buildNotification } from "./templates.js";
import { isSafeInternalLink, sanitizeLink } from "./linkValidator.js";
import { validateAudience, buildAudienceFilterSpec, describeAudience } from "./audience.js";
import { buildDedupeKey } from "./dedupe.js";
import {
  ACTIVE_NOTIFICATION_TYPES,
  TITLE_MAX,
  MESSAGE_MAX,
} from "../../config/notifications.js";

test("Notifications Pure Module Test Suite", async (t) => {
  await t.test("1. Every non-reserved type builds with non-empty title, message, and safe link", () => {
    for (const type of ACTIVE_NOTIFICATION_TYPES) {
      const sampleParams = {
        leaderName: "Rahul Sharma",
        size: 3,
        name: "Aman Gupta",
        hostelName: "Mandakini Hostel",
        roomNumber: "B-204",
        reason: "Preferred floor not available",
        nextStep: "Contact warden",
        newLeaderName: "Priya Patel",
        title: "Test Campus Announcement",
        message: "A test message from administrator.",
        link: "/dashboard/hostels",
      };

      const res = buildNotification(type, sampleParams);
      assert.ok(res.title && res.title.trim().length > 0, `Title for ${type} must not be empty`);
      assert.ok(res.message && res.message.trim().length > 0, `Message for ${type} must not be empty`);
      assert.ok(res.title.length <= TITLE_MAX, `Title for ${type} exceeds max length ${TITLE_MAX}`);
      assert.ok(res.message.length <= MESSAGE_MAX, `Message for ${type} exceeds max length ${MESSAGE_MAX}`);
      assert.ok(["info", "success", "warning"].includes(res.severity), `Invalid severity for ${type}`);

      if (res.link !== null) {
        assert.ok(isSafeInternalLink(res.link), `Link ${res.link} for ${type} must be a safe internal link`);
      }
    }
  });

  await t.test("2. Safe fallbacks for missing params (never outputs 'undefined' or 'null')", () => {
    for (const type of ACTIVE_NOTIFICATION_TYPES) {
      // Pass completely empty params
      const res = buildNotification(type, {});
      assert.ok(!res.title.includes("undefined"), `Title for ${type} contains literal 'undefined'`);
      assert.ok(!res.title.includes("null"), `Title for ${type} contains literal 'null'`);
      assert.ok(!res.message.includes("undefined"), `Message for ${type} contains literal 'undefined'`);
      assert.ok(!res.message.includes("null"), `Message for ${type} contains literal 'null'`);

      // Pass undefined and null values explicitly
      const res2 = buildNotification(type, {
        leaderName: undefined,
        name: null,
        hostelName: undefined,
        roomNumber: null,
        title: null,
        message: undefined,
      });
      assert.ok(!res2.title.includes("undefined"));
      assert.ok(!res2.title.includes("null"));
      assert.ok(!res2.message.includes("undefined"));
      assert.ok(!res2.message.includes("null"));
    }
  });

  await t.test("3. Unknown type throws descriptive error", () => {
    assert.throws(
      () => buildNotification("non_existent_type", {}),
      /Unknown or unsupported notification type/
    );
    assert.throws(
      () => buildNotification(null, {}),
      /valid notification type string is required/
    );
  });

  await t.test("4. Length limits strictly enforced with ellipsis", () => {
    const hugeTitle = "A".repeat(150);
    const hugeMessage = "B".repeat(500);

    const res = buildNotification("announcement", {
      title: hugeTitle,
      message: hugeMessage,
    });

    assert.equal(res.title.length, TITLE_MAX, `Title length must equal TITLE_MAX (${TITLE_MAX})`);
    assert.ok(res.title.endsWith("..."), "Truncated title must end with ellipsis");
    assert.equal(res.message.length, MESSAGE_MAX, `Message length must equal MESSAGE_MAX (${MESSAGE_MAX})`);
    assert.ok(res.message.endsWith("..."), "Truncated message must end with ellipsis");
  });

  await t.test("5. Privacy checks: notification text never contains email, phone, or phone-like digits", () => {
    for (const type of ACTIVE_NOTIFICATION_TYPES) {
      const res = buildNotification(type, {
        name: "Karan Johar",
        leaderName: "Anita Roy",
        hostelName: "Cauvery",
        roomNumber: "102",
      });

      const combined = `${res.title} ${res.message}`.toLowerCase();
      assert.ok(!combined.includes("@"), `Notification for ${type} contains '@' symbol`);
      assert.ok(!combined.includes("phone"), `Notification for ${type} contains the word 'phone'`);

      // No 10-digit phone patterns
      const phoneRegex = /\b\d{10}\b/;
      assert.ok(!phoneRegex.test(combined), `Notification for ${type} contains a 10-digit phone number pattern`);
    }
  });

  await t.test("6. Link Validator security test suite", () => {
    // Valid links
    assert.equal(isSafeInternalLink("/dashboard/room"), true);
    assert.equal(isSafeInternalLink("/dashboard/group"), true);
    assert.equal(isSafeInternalLink("/dashboard/invitations"), true);
    assert.equal(isSafeInternalLink("/admin/announcements"), true);
    assert.equal(isSafeInternalLink("/"), true);

    // Invalid & Dangerous links
    assert.equal(isSafeInternalLink("https://evil.com"), false);
    assert.equal(isSafeInternalLink("http://evil.com"), false);
    assert.equal(isSafeInternalLink("//evil.com"), false);
    assert.equal(isSafeInternalLink("javascript:alert(1)"), false);
    assert.equal(isSafeInternalLink("/\\evil"), false);
    assert.equal(isSafeInternalLink("/dashboard/room with space"), false);
    assert.equal(isSafeInternalLink("   /dashboard/room"), false);
    assert.equal(isSafeInternalLink(""), false);
    assert.equal(isSafeInternalLink(null), false);
    assert.equal(isSafeInternalLink(undefined), false);
    assert.equal(isSafeInternalLink(12345), false);
    assert.equal(isSafeInternalLink("/" + "a".repeat(250)), false); // exceeds 200 chars

    // sanitizeLink helper
    assert.equal(sanitizeLink("/dashboard/room", "/fallback"), "/dashboard/room");
    assert.equal(sanitizeLink("https://evil.com", null), null);
    assert.equal(sanitizeLink("https://evil.com", "/dashboard"), "/dashboard");
  });

  await t.test("7. Audience validation accepts all valid types and rejects invalid ones", () => {
    // all_students
    assert.deepEqual(validateAudience({ type: "all_students" }), { type: "all_students" });

    // gender
    assert.deepEqual(validateAudience({ type: "gender", gender: "female" }), { type: "gender", gender: "female" });
    assert.deepEqual(validateAudience({ type: "gender", gender: "MALE" }), { type: "gender", gender: "male" });
    assert.throws(() => validateAudience({ type: "gender", gender: "invalid" }), /Invalid gender/);

    // year
    assert.deepEqual(validateAudience({ type: "year", year: 2 }), { type: "year", year: 2 });
    assert.deepEqual(validateAudience({ type: "year", year: "3" }), { type: "year", year: 3 });
    assert.throws(() => validateAudience({ type: "year", year: 0 }), /Invalid academic year/);
    assert.throws(() => validateAudience({ type: "year", year: 7 }), /Invalid academic year/);

    // hostel
    assert.deepEqual(validateAudience({ type: "hostel", hostelId: "60c72b2f9b1d8b2bad000001" }), {
      type: "hostel",
      hostelId: "60c72b2f9b1d8b2bad000001",
    });
    assert.throws(() => validateAudience({ type: "hostel" }), /Hostel ID is required/);

    // allocated & not_allocated
    assert.deepEqual(validateAudience({ type: "allocated" }), { type: "allocated" });
    assert.deepEqual(validateAudience({ type: "not_allocated" }), { type: "not_allocated" });

    // group_status
    assert.deepEqual(validateAudience({ type: "group_status", status: "forming" }), { type: "group_status", status: "forming" });
    assert.deepEqual(validateAudience({ type: "group_status", status: "complete" }), { type: "group_status", status: "complete" });
    assert.deepEqual(validateAudience({ type: "group_status", status: "locked" }), { type: "group_status", status: "locked" });
    assert.deepEqual(validateAudience({ type: "group_status", status: "none" }), { type: "group_status", status: "none" });
    assert.throws(() => validateAudience({ type: "group_status", status: "disbanded" }), /Invalid group status/);

    // unknown type
    assert.throws(() => validateAudience({ type: "random_audience" }), /Unknown or invalid audience type/);
    assert.throws(() => validateAudience(null), /Audience must be a non-null object/);
  });

  await t.test("8. buildAudienceFilterSpec and describeAudience generate accurate representations", () => {
    const specGender = buildAudienceFilterSpec({ type: "gender", gender: "female" });
    assert.deepEqual(specGender, { role: "student", isActive: true, gender: "female" });

    const specYear = buildAudienceFilterSpec({ type: "year", year: 3 });
    assert.deepEqual(specYear, { role: "student", isActive: true, year: 3 });

    const descAll = describeAudience({ type: "all_students" });
    assert.equal(descAll, "All active students");

    const descGender = describeAudience({ type: "gender", gender: "female" });
    assert.equal(descGender, "Female students");

    const descHostel = describeAudience(
      { type: "hostel", hostelId: "h123" },
      { hostelName: "Kaveri Hostel" }
    );
    assert.equal(descHostel, "Students allocated in Kaveri Hostel");
  });

  await t.test("9. Dedupe keys are deterministic, stable, and distinct", () => {
    const key1 = buildDedupeKey("invitation_received", "inv_123");
    const key2 = buildDedupeKey("invitation_received", ["inv_123"]);
    assert.equal(key1, "invitation_received:inv_123");
    assert.equal(key2, "invitation_received:inv_123");

    const key3 = buildDedupeKey("invitation_received", "inv_456");
    assert.notEqual(key1, key3);

    const keyMulti = buildDedupeKey("allocation_published", ["run_999", "room_12"]);
    assert.equal(keyMulti, "allocation_published:run_999:room_12");

    const keyObj = buildDedupeKey("event", { b: 2, a: 1 });
    const keyObj2 = buildDedupeKey("event", { a: 1, b: 2 });
    assert.equal(keyObj, keyObj2);
    assert.equal(keyObj, "event:a=1:b=2");
  });
});
