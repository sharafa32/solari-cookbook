import assert from "node:assert/strict"
import test from "node:test"
import { dryRunEvidence } from "../src/dry-run.js"
import { makeVerdict, stableJson } from "../src/evaluate.js"
import type { Campaign } from "../src/types.js"

const campaign: Campaign = {
  campaign: "cart",
  port: 3000,
  journeys: [
    { id: "count", steps: [{ action: "goto", path: "/" }] },
    { id: "reset", steps: [{ action: "goto", path: "/" }] },
  ],
}

test("independent verifier promotes only a passing non-regressing candidate", () => {
  const { baseline, candidate } = dryRunEvidence(campaign)
  const verdict = makeVerdict(campaign, baseline, candidate)
  assert.equal(verdict.promoted, true)
  assert.equal(verdict.repairedFailures, 1)
  assert.equal(verdict.regressions, 0)
  assert.match(verdict.evidenceSha256, /^[a-f0-9]{64}$/)
})

test("stableJson produces the same digest material regardless of key insertion order", () => {
  assert.equal(stableJson({ b: 2, a: { d: 4, c: 3 } }), stableJson({ a: { c: 3, d: 4 }, b: 2 }))
})
