import { createHash } from "node:crypto"
import type { Campaign, RunEvidence, Verdict } from "./types.js"

function failures(run: RunEvidence): Set<string> {
  return new Set(run.journeys.filter((journey) => !journey.passed).map((journey) => journey.id))
}

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`
  }
  return JSON.stringify(value)
}

export function makeVerdict(campaign: Campaign, baseline: RunEvidence, candidate: RunEvidence): Verdict {
  const before = failures(baseline)
  const after = failures(candidate)
  const repairedFailures = [...before].filter((id) => !after.has(id)).length
  const regressions = [...after].filter((id) => !before.has(id)).length
  const promoted = candidate.passed && regressions === 0
  const reason = promoted
    ? `promoted: candidate repaired ${repairedFailures} failing journey(s) with no regression`
    : `rejected: ${after.size} journey(s) still failing and ${regressions} regression(s) detected`
  const evidenceSha256 = createHash("sha256")
    .update(stableJson({ campaign, baseline, candidate }))
    .digest("hex")
  return {
    campaign: campaign.campaign,
    baselinePassed: baseline.passed,
    candidatePassed: candidate.passed,
    repairedFailures,
    regressions,
    promoted,
    reason,
    evidenceSha256,
  }
}
