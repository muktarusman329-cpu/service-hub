import assert from "node:assert/strict";
import { test } from "node:test";
import { assertBookingTransition, canTransitionBooking, DefaultMatchingStrategy, detectMessageFlags, intervalsOverlap, isExpired, isTechnicianAvailableInWindow, sanitizeMessageText } from "./booking-primitives";

test("booking state machine enforces state and actor permissions with required reasons", () => {
  assert.equal(canTransitionBooking("REQUESTED", "QUOTED", "SYSTEM"), true);
  assert.equal(canTransitionBooking("QUOTED", "ACCEPTED", "USER"), true);
  assert.equal(canTransitionBooking("QUOTED", "ACCEPTED", "TECHNICIAN"), false);
  assert.equal(canTransitionBooking("IN_PROGRESS", "COMPLETED", "USER"), false);
  assert.equal(canTransitionBooking("IN_PROGRESS", "CANCELLED_BY_TECHNICIAN", "TECHNICIAN"), false);
  assert.equal(canTransitionBooking("IN_PROGRESS", "CANCELLED_BY_TECHNICIAN", "TECHNICIAN", "Cannot reach location"), true);
  assert.equal(canTransitionBooking("COMPLETED_PENDING_CONFIRMATION", "DISPUTED", "USER", "Work is incomplete"), true);
  assert.equal(canTransitionBooking("DISPUTED", "COMPLETED", "ADMIN", "resolved"), false);
  assert.throws(() => assertBookingTransition("QUOTED", "COMPLETED", "USER"), /Invalid booking transition/);
});

test("matching ranks by distance, then rating, response rate and recency", () => {
  const now = new Date();
  const candidates = [
    { id: "recent", distanceMeters: null, ratingAverage: 5, responseRate: 1, lastActiveAt: now },
    { id: "near", distanceMeters: 100, ratingAverage: 0, responseRate: 0, lastActiveAt: new Date(0) },
    { id: "far", distanceMeters: 500, ratingAverage: 5, responseRate: 1, lastActiveAt: now },
    { id: "highRated", distanceMeters: 100, ratingAverage: 4.9, responseRate: 0.7, lastActiveAt: new Date(1) }
  ];
  assert.deepEqual(new DefaultMatchingStrategy().rank(candidates).map(x => x.id), ["highRated", "near", "far", "recent"]);
});

test("expiry and availability use UTC instants and half-open overlap windows", () => {
  const start = new Date("2026-10-29T09:00:00Z");
  const end = new Date("2026-10-29T10:00:00Z");
  assert.equal(isExpired(new Date(start.getTime() - 1), start), true);
  assert.equal(isExpired(end, start), false);
  assert.equal(intervalsOverlap(start, end, new Date("2026-10-29T10:00:00Z"), new Date("2026-10-29T11:00:00Z")), false);
  assert.equal(isTechnicianAvailableInWindow(start, end, [], [{ startsAt: new Date("2026-10-29T09:30:00Z"), endsAt: new Date("2026-10-29T10:30:00Z") }]), false);
  assert.equal(isTechnicianAvailableInWindow(start, end, [{ startsAt: new Date("2026-10-29T08:00:00Z"), endsAt: new Date("2026-10-29T09:00:00Z") }], []), true);
});

test("chat moderation detects phone, off-platform payment and external links without blocking text", () => {
  assert.deepEqual(detectMessageFlags("Call me on 08031234567; pay outside the app at https://example.com"), ["phone_number", "off_platform_payment", "external_link"]);
  assert.deepEqual(detectMessageFlags("I can start after lunch"), []);
  assert.equal(sanitizeMessageText("  <script>alert(1)</script> Safe text  "), "alert(1) Safe text");
  assert.equal(sanitizeMessageText("x".repeat(4100)).length, 4000);
});
