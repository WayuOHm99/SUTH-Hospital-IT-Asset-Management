import test from "node:test";
import assert from "node:assert/strict";

import { resolveApiBaseUrl } from "./apiConfig.js";

test("uses the same-origin API path when no URL is configured", () => {
  assert.equal(resolveApiBaseUrl(), "/api");
  assert.equal(resolveApiBaseUrl("   "), "/api");
});

test("normalizes an explicitly configured API URL", () => {
  assert.equal(
    resolveApiBaseUrl(" https://api.example.test/api/ "),
    "https://api.example.test/api"
  );
  assert.equal(resolveApiBaseUrl("/custom-api/"), "/custom-api");
  assert.equal(resolveApiBaseUrl("/"), "/");
});
