export type JourneyStep =
  | { action: "goto"; path: string }
  | { action: "click"; selector: string }
  | { action: "fill"; selector: string; value: string }
  | { action: "assertText"; selector: string; text: string }
  | { action: "assertVisible"; selector: string }

export interface Journey {
  id: string
  steps: JourneyStep[]
}

export interface Campaign {
  campaign: string
  port: number
  journeys: Journey[]
}

export interface AssertionEvidence {
  step: number
  action: JourneyStep["action"]
  passed: boolean
  detail: string
  durationMs: number
}

export interface JourneyEvidence {
  id: string
  passed: boolean
  assertions: AssertionEvidence[]
  consoleErrors: string[]
  screenshot: string
  durationMs: number
}

export interface RunEvidence {
  label: "baseline" | "candidate"
  sandboxId: string
  browserSessionId: string
  previewUrl: string
  replayUrl: string | null
  journeys: JourneyEvidence[]
  passed: boolean
  startedAt: string
  finishedAt: string
}

export interface Verdict {
  campaign: string
  baselinePassed: boolean
  candidatePassed: boolean
  repairedFailures: number
  regressions: number
  promoted: boolean
  reason: string
  evidenceSha256: string
}

export interface EvidenceBundle {
  schema: "forge-solari-evidence/v1"
  campaign: Campaign
  baseline: RunEvidence
  candidate: RunEvidence
  verdict: Verdict
}
