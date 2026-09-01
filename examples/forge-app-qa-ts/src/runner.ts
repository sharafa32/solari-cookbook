import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { Solari } from "@solarisdk/browser"
import { SolariClient } from "@solarisdk/sdk"
import type { Sandbox } from "@solarisdk/sdk"
import { BROKEN_APP, REPAIRED_APP } from "./demo-app.js"
import type {
  AssertionEvidence,
  Campaign,
  Journey,
  JourneyEvidence,
  JourneyStep,
  RunEvidence,
} from "./types.js"

const APP_DIR = "/workspace/forge-app"

interface PageLike {
  goto(url: string, options?: { waitUntil?: "domcontentloaded" | "load" | "networkidle" }): Promise<unknown>
  locator(selector: string): {
    click(): Promise<void>
    fill(value: string): Promise<void>
    innerText(): Promise<string>
    waitFor(options?: { state?: "visible" }): Promise<void>
  }
  screenshot(options?: { fullPage?: boolean }): Promise<Uint8Array>
  on(event: "console", callback: (message: { type(): string; text(): string }) => void): void
  on(event: "pageerror", callback: (error: Error) => void): void
}

const now = () => performance.now()

async function executeStep(page: PageLike, baseUrl: string, step: JourneyStep): Promise<string> {
  switch (step.action) {
    case "goto":
      await page.goto(new URL(step.path, baseUrl).toString(), { waitUntil: "networkidle" })
      return `navigated to ${step.path}`
    case "click":
      await page.locator(step.selector).click()
      return `clicked ${step.selector}`
    case "fill":
      await page.locator(step.selector).fill(step.value)
      return `filled ${step.selector}`
    case "assertText": {
      const actual = (await page.locator(step.selector).innerText()).trim()
      if (actual !== step.text) throw new Error(`expected ${JSON.stringify(step.text)}, received ${JSON.stringify(actual)}`)
      return `${step.selector} matched ${JSON.stringify(step.text)}`
    }
    case "assertVisible":
      await page.locator(step.selector).waitFor({ state: "visible" })
      return `${step.selector} is visible`
  }
}

async function runJourney(
  page: PageLike,
  baseUrl: string,
  journey: Journey,
  label: string,
  artifactDir: string,
): Promise<JourneyEvidence> {
  const started = now()
  const assertions: AssertionEvidence[] = []
  const consoleErrors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  })
  page.on("pageerror", (error) => consoleErrors.push(error.message))

  for (const [index, step] of journey.steps.entries()) {
    const stepStarted = now()
    try {
      const detail = await executeStep(page, baseUrl, step)
      assertions.push({ step: index + 1, action: step.action, passed: true, detail, durationMs: Math.round(now() - stepStarted) })
    } catch (error) {
      assertions.push({
        step: index + 1,
        action: step.action,
        passed: false,
        detail: error instanceof Error ? error.message : String(error),
        durationMs: Math.round(now() - stepStarted),
      })
      break
    }
  }

  const screenshot = `${label}-${journey.id}.png`
  await writeFile(path.join(artifactDir, screenshot), await page.screenshot({ fullPage: true }))
  return {
    id: journey.id,
    passed: assertions.length === journey.steps.length && assertions.every((item) => item.passed) && consoleErrors.length === 0,
    assertions,
    consoleErrors,
    screenshot,
    durationMs: Math.round(now() - started),
  }
}

async function waitForPreview(url: string): Promise<void> {
  let lastStatus = "not reachable"
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch(url)
      lastStatus = `HTTP ${response.status}`
      if (response.ok) return
    } catch (error) {
      lastStatus = error instanceof Error ? error.message : String(error)
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`preview did not become healthy: ${lastStatus}`)
}

async function replayUrl(client: Solari, sessionId: string): Promise<string | null> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1_000))
    try {
      return (await client.sessions.getReplayUrl(sessionId)).url
    } catch {
      // Replay uploads are asynchronous after release; retry for ten seconds.
    }
  }
  return null
}

async function runBrowserSuite(
  browserClient: Solari,
  campaign: Campaign,
  previewUrl: string,
  label: RunEvidence["label"],
  sandboxId: string,
  artifactDir: string,
): Promise<RunEvidence> {
  const startedAt = new Date().toISOString()
  const browser = await browserClient.launch({ recording: true, retries: 2, probe: true })
  const browserSessionId = browser.id
  const journeys: JourneyEvidence[] = []
  try {
    for (const journey of campaign.journeys) {
      const page = await browser.newPage() as unknown as PageLike
      journeys.push(await runJourney(page, previewUrl, journey, label, artifactDir))
    }
  } finally {
    await browser.close()
  }
  return {
    label,
    sandboxId,
    browserSessionId,
    previewUrl,
    replayUrl: await replayUrl(browserClient, browserSessionId),
    journeys,
    passed: journeys.length === campaign.journeys.length && journeys.every((journey) => journey.passed),
    startedAt,
    finishedAt: new Date().toISOString(),
  }
}

async function serveFixture(sandbox: Sandbox, source: string, port: number): Promise<{ url: string; stop(): Promise<void> }> {
  await sandbox.files.mkdir(APP_DIR).catch(() => undefined)
  await sandbox.files.write(`${APP_DIR}/index.html`, source)
  const server = await sandbox.commands.start("python3", {
    args: ["-m", "http.server", String(port), "--bind", "0.0.0.0"],
    cwd: APP_DIR,
  })
  const { url } = await sandbox.previewUrl(port)
  await waitForPreview(url)
  return { url, stop: async () => { await server.kill().catch(() => undefined) } }
}

export async function runLiveCampaign(campaign: Campaign, apiKey: string, artifactDir: string): Promise<{ baseline: RunEvidence; candidate: RunEvidence }> {
  await mkdir(artifactDir, { recursive: true })
  const infrastructure = new SolariClient({ apiKey })
  const browserClient = new Solari({ apiKey })
  let snapshotId: string | undefined

  try {
    const baselineSandbox = await infrastructure.sandboxes.create({
      template: "base",
      cpu: 1,
      memMb: 2048,
      timeoutMs: 5 * 60_000,
      metadata: { application: "forge-solari", campaign: campaign.campaign, role: "baseline" },
    })
    try {
      await baselineSandbox.connect()
      await baselineSandbox.files.mkdir(APP_DIR).catch(() => undefined)
      await baselineSandbox.files.write(`${APP_DIR}/index.html`, BROKEN_APP)
      snapshotId = await baselineSandbox.snapshot(`${campaign.campaign}-pristine`)
      const server = await serveFixture(baselineSandbox, BROKEN_APP, campaign.port)
      try {
        const baseline = await runBrowserSuite(browserClient, campaign, server.url, "baseline", baselineSandbox.id, artifactDir)
        await server.stop()

        await baselineSandbox.kill()
        const candidateSandbox = await infrastructure.sandboxes.create({
          template: "base",
          fromSnapshot: snapshotId,
          cpu: 1,
          memMb: 2048,
          timeoutMs: 5 * 60_000,
          metadata: { application: "forge-solari", campaign: campaign.campaign, role: "candidate" },
        })
        try {
          await candidateSandbox.connect()
          const candidateServer = await serveFixture(candidateSandbox, REPAIRED_APP, campaign.port)
          try {
            const candidate = await runBrowserSuite(browserClient, campaign, candidateServer.url, "candidate", candidateSandbox.id, artifactDir)
            return { baseline, candidate }
          } finally {
            await candidateServer.stop()
          }
        } finally {
          await candidateSandbox.kill()
        }
      } finally {
        await server.stop()
      }
    } finally {
      await baselineSandbox.kill()
    }
  } finally {
    if (snapshotId) await infrastructure.sandboxes.deleteSnapshot(snapshotId).catch(() => undefined)
    await browserClient.close()
  }
}
