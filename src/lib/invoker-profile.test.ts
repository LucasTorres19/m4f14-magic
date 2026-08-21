import assert from "node:assert/strict";
import test from "node:test";

import { getInvokerInitials, normalizeInvokerAlias } from "./invoker-profile";

void test("builds initials from the first two words", () => {
  assert.equal(getInvokerInitials("Carlos Daniel"), "CD");
  assert.equal(getInvokerInitials("  thiago   pereyra  "), "TP");
});

void test("uses a useful fallback for an empty name", () => {
  assert.equal(getInvokerInitials(null), "?");
  assert.equal(getInvokerInitials("   "), "?");
});

void test("normalizes optional aliases without changing their wording", () => {
  assert.equal(normalizeInvokerAlias("  El Gordo Coca  "), "El Gordo Coca");
  assert.equal(normalizeInvokerAlias("   "), null);
  assert.equal(normalizeInvokerAlias(null), null);
});
