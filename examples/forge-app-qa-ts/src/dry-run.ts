import type { Campaign, JourneyEvidence, RunEvidence } from "./types.js"

function journey(id: string, passed: boolean, label: string): JourneyEvidence {
  return {
    id,
    passed,
    assertions: [{
      step: 1,
      action: "assertText",
      passed,
      detail: passed ? "acceptance contract satisfied" : "expected \"1\", received \"2\"",
      durationMs: 12,
    }],
    consoleErrors: [],
    screenshot: `${label}-${id}.png`,
    durationMs: 34,
  }
}

function run(campaign: Campaign, label: RunEvidence["label"], passed: boolean): RunEvidence {
  const timestamp = new Date(0).toISOString()
  return {
    label,
    sandboxId: `dry_${label}`,
    browserSessionId: `dry_browser_${label}`,
    previewUrl: "https://dry-run.preview.getsolari.com",
    replayUrl: null,
    journeys: campaign.journeys.map((item, index) => journey(item.id, passed || index > 0, label)),
    passed,
    startedAt: timestamp,
    finishedAt: timestamp,
  }
}

export function dryRunEvidence(campaign: Campaign): { baseline: RunEvidence; candidate: RunEvidence } {
  return { baseline: run(campaign, "baseline", false), candidate: run(campaign, "candidate", true) }
}
