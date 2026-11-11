const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isValidDisputeDecision,
  isValidDisputeNotes,
  isValidDisputeEvidence,
} = require("../utils/disputeValidation");

test("accepts refund_learner", () => {
  assert.equal(isValidDisputeDecision("refund_learner"), true);
});

test("accepts pay_teacher", () => {
  assert.equal(isValidDisputeDecision("pay_teacher"), true);
});

test("rejects invalid decisions", () => {
  assert.equal(isValidDisputeDecision("approve"), false);
  assert.equal(isValidDisputeDecision(""), false);
  assert.equal(isValidDisputeDecision(undefined), false);
  assert.equal(isValidDisputeDecision(null), false);
});

test("allows optional dispute notes", () => {
  assert.equal(isValidDisputeNotes(undefined), true);
  assert.equal(isValidDisputeNotes(""), true);
  assert.equal(isValidDisputeNotes("Resolution notes"), true);
});

test("rejects non-string notes", () => {
  assert.equal(isValidDisputeNotes(123), false);
  assert.equal(isValidDisputeNotes(null), false);
  assert.equal(isValidDisputeNotes({}), false);
});

test("enforces the 2000-character trimmed notes limit", () => {
  assert.equal(isValidDisputeNotes("a".repeat(2000)), true);
  assert.equal(isValidDisputeNotes("a".repeat(2001)), false);
  assert.equal(isValidDisputeNotes(" ".repeat(2001)), true);
});

test("allows optional dispute evidence", () => {
  assert.equal(isValidDisputeEvidence(undefined), true);
  assert.equal(isValidDisputeEvidence(""), true);
  assert.equal(isValidDisputeEvidence("Evidence details"), true);
});

test("rejects non-string evidence", () => {
  assert.equal(isValidDisputeEvidence(123), false);
  assert.equal(isValidDisputeEvidence(null), false);
  assert.equal(isValidDisputeEvidence({}), false);
});

test("enforces the 5000-character evidence limit", () => {
  assert.equal(isValidDisputeEvidence("a".repeat(5000)), true);
  assert.equal(isValidDisputeEvidence("a".repeat(5001)), false);
});