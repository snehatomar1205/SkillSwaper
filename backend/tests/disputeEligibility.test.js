const test = require("node:test");
const assert = require("node:assert/strict");

const {
  canResolveDispute,
} = require("../utils/disputeEligibility");

test("allows a disputed request with reserved credits", () => {
  assert.equal(
    canResolveDispute({
      status: "disputed",
      creditsReserved: true,
    }),
    true
  );
});

test("rejects requests that are not disputed", () => {
  assert.equal(
    canResolveDispute({
      status: "accepted",
      creditsReserved: true,
    }),
    false
  );
});

test("rejects disputed requests without reserved credits", () => {
  assert.equal(
    canResolveDispute({
      status: "disputed",
      creditsReserved: false,
    }),
    false
  );
});

test("rejects missing or invalid requests", () => {
  assert.equal(canResolveDispute(null), false);
  assert.equal(canResolveDispute(undefined), false);
  assert.equal(canResolveDispute({}), false);
});