import assert from "node:assert/strict"
import test from "node:test"
import { parseCampaign } from "../src/contract.js"

test("parseCampaign accepts a bounded journey contract", () => {
  const campaign = parseCampaign({
    campaign: "checkout",
    port: 3000,
    journeys: [{ id: "buy", steps: [{ action: "goto", path: "/" }, { action: "assertVisible", selector: "h1" }] }],
  })
  assert.equal(campaign.journeys[0]?.steps.length, 2)
})

test("parseCampaign rejects duplicate journey identities", () => {
  assert.throws(() => parseCampaign({
    campaign: "checkout",
    port: 3000,
    journeys: [
      { id: "buy", steps: [{ action: "goto", path: "/" }] },
      { id: "buy", steps: [{ action: "goto", path: "/again" }] },
    ],
  }), /duplicate journey id/)
})
