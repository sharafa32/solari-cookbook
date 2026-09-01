import type { EvidenceBundle, RunEvidence } from "./types.js"

const html = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")

function runCard(run: RunEvidence): string {
  const journeys = run.journeys.map((journey) => `
    <li class="journey ${journey.passed ? "pass" : "fail"}">
      <span>${journey.passed ? "PASS" : "FAIL"}</span>
      <strong>${html(journey.id)}</strong>
      <small>${journey.durationMs} ms · ${journey.assertions.length} steps</small>
    </li>`).join("")
  return `<section>
    <div class="section-head"><h2>${html(run.label)}</h2><b class="pill ${run.passed ? "pass" : "fail"}">${run.passed ? "PASSED" : "FAILED"}</b></div>
    <ul>${journeys}</ul>
    ${run.replayUrl ? `<a href="${html(run.replayUrl)}">Open Solari session replay</a>` : "<span>Replay pending</span>"}
  </section>`
}

export function renderReport(bundle: EvidenceBundle): string {
  const { verdict } = bundle
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Forge Solari report</title><style>
  :root{font-family:Inter,ui-sans-serif,system-ui;color-scheme:dark}body{margin:0;background:#070a10;color:#edf2f7}.wrap{width:min(1020px,90vw);margin:50px auto}.hero,section{border:1px solid #263044;background:#101620;border-radius:22px;padding:28px;margin:18px 0}.kicker{color:#38bdf8;letter-spacing:.16em;text-transform:uppercase;font-size:12px}h1{font-size:48px;margin:8px 0}.verdict{font-size:20px;color:${verdict.promoted ? "#86efac" : "#fca5a5"}}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.section-head,.journey{display:flex;align-items:center;gap:12px}.section-head{justify-content:space-between}.pill,.journey span{padding:5px 9px;border-radius:999px;font-size:11px;letter-spacing:.08em}.pass{color:#86efac}.pass span,.pill.pass{background:#12351f}.fail{color:#fca5a5}.fail span,.pill.fail{background:#44191c}ul{padding:0}.journey{list-style:none;padding:12px 0;border-bottom:1px solid #222c3e}.journey strong{color:#edf2f7}.journey small{margin-left:auto;color:#8794a8}a{color:#7dd3fc}.hash{font-family:ui-monospace,monospace;overflow-wrap:anywhere;color:#8794a8}@media(max-width:760px){.grid{grid-template-columns:1fr}h1{font-size:38px}}
  </style></head><body><main class="wrap"><div class="hero"><div class="kicker">Independent promotion gate</div><h1>Forge Solari</h1><p class="verdict">${html(verdict.reason)}</p><p>${verdict.repairedFailures} repaired · ${verdict.regressions} regressions</p><div class="hash">Evidence SHA-256: ${verdict.evidenceSha256}</div></div><div class="grid">${runCard(bundle.baseline)}${runCard(bundle.candidate)}</div></main></body></html>`
}
