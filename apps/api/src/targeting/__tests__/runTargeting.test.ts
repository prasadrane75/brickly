import test from "node:test";
import assert from "node:assert/strict";
import { buildTargetingMessage } from "../runTargeting.js";

test("buildTargetingMessage includes recommendation", () => {
  const message = buildTargetingMessage("455 Cedar Loop");
  assert.ok(message.includes("New opportunity: shares available in 455 Cedar Loop"));
  assert.ok(
    message.includes(
      "Recommended: place a LIMIT buy near the reference price to capture availability."
    )
  );
});
