import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parseCampaign } from "./contract.js"
import { dryRunEvidence } from "./dry-run.js"
import { makeVerdict } from "./evaluate.js"
import { renderReport } from "./report.js"
import { runLiveCampaign } from "./runner.js"
import type { EvidenceBundle } from "./types.js"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const dryRun = process.argv.includes("--dry-run")
const campaign = parseCampaign(JSON.parse(await readFile(path.join(root, "forge.config.json"), "utf8")))
const artifactDir = path.join(root, "artifacts", `${campaign.campaign}-${Date.now()}`)
await mkdir(artifactDir, { recursive: true })

const evidence = dryRun
  ? dryRunEvidence(campaign)
  : await runLiveCampaign(
      campaign,
      process.env.SOLARI_API_KEY ?? (() => { throw new Error("SOLARI_API_KEY is required; use --dry-run for offline verification") })(),
      artifactDir,
    )

const verdict = makeVerdict(campaign, evidence.baseline, evidence.candidate)
const bundle: EvidenceBundle = {
  schema: "forge-solari-evidence/v1",
  campaign,
  baseline: evidence.baseline,
  candidate: evidence.candidate,
  verdict,
}

await writeFile(path.join(artifactDir, "evidence.json"), `${JSON.stringify(bundle, null, 2)}\n`)
await writeFile(path.join(artifactDir, "report.html"), renderReport(bundle))

console.log(`campaign : ${campaign.campaign}`)
console.log(`baseline : ${bundle.baseline.passed ? "PASS" : "FAIL"}`)
console.log(`candidate: ${bundle.candidate.passed ? "PASS" : "FAIL"}`)
console.log(`verdict  : ${verdict.promoted ? "PROMOTE" : "REJECT"}`)
console.log(`evidence : ${verdict.evidenceSha256}`)
console.log(`report   : ${path.join(artifactDir, "report.html")}`)

if (!verdict.promoted) process.exitCode = 1
