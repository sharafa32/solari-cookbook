import assert from "node:assert/strict"
import test from "node:test"
import { resolvePreviewNavigationUrl } from "../src/runner.js"

test("preview navigation preserves Solari authentication tokens", () => {
  const base = "https://fixture-3000.preview.getsolari.com?pt_token=secret-token"

  assert.equal(
    resolvePreviewNavigationUrl(base, "/checkout"),
    "https://fixture-3000.preview.getsolari.com/checkout?pt_token=secret-token",
  )
})

test("preview navigation keeps an explicitly supplied query", () => {
  const base = "https://fixture-3000.preview.getsolari.com?pt_token=secret-token"

  assert.equal(
    resolvePreviewNavigationUrl(base, "/checkout?mode=repair"),
    "https://fixture-3000.preview.getsolari.com/checkout?mode=repair",
  )
})
