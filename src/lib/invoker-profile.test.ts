import assert from "node:assert/strict";
import test from "node:test";

import { getInvokerInitials } from "./invoker-profile";

void test("builds initials from the first two words", () => {
  assert.equal(getInvokerInitials("Carlos Daniel"), "CD");
  assert.equal(getInvokerInitials("  thiago   pereyra  "), "TP");
});

void test("uses a useful fallback for an empty name", () => {
  assert.equal(getInvokerInitials(null), "?");
  assert.equal(getInvokerInitials("   "), "?");
});
