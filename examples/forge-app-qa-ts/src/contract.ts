import type { Campaign, JourneyStep } from "./types.js"

const ACTIONS = new Set(["goto", "click", "fill", "assertText", "assertVisible"])

function object(value: unknown, message: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(message)
  }
  return value as Record<string, unknown>
}

function nonEmpty(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} must be a non-empty string`)
  }
  return value
}

export function parseCampaign(value: unknown): Campaign {
  const root = object(value, "campaign must be an object")
  const campaign = nonEmpty(root.campaign, "campaign")
  if (!Number.isInteger(root.port) || (root.port as number) < 1 || (root.port as number) > 65_535) {
    throw new Error("port must be an integer from 1 to 65535")
  }
  if (!Array.isArray(root.journeys) || root.journeys.length === 0) {
    throw new Error("journeys must be a non-empty array")
  }

  const ids = new Set<string>()
  const journeys = root.journeys.map((rawJourney, journeyIndex) => {
    const journey = object(rawJourney, `journeys[${journeyIndex}] must be an object`)
    const id = nonEmpty(journey.id, `journeys[${journeyIndex}].id`)
    if (ids.has(id)) throw new Error(`duplicate journey id: ${id}`)
    ids.add(id)
    if (!Array.isArray(journey.steps) || journey.steps.length === 0) {
      throw new Error(`journey ${id} must contain at least one step`)
    }
    const steps = journey.steps.map((rawStep, stepIndex) => {
      const step = object(rawStep, `${id}.steps[${stepIndex}] must be an object`)
      if (typeof step.action !== "string" || !ACTIONS.has(step.action)) {
        throw new Error(`${id}.steps[${stepIndex}] has an unsupported action`)
      }
      if (step.action === "goto") {
        return { action: "goto", path: nonEmpty(step.path, `${id}.steps[${stepIndex}].path`) }
      }
      const selector = nonEmpty(step.selector, `${id}.steps[${stepIndex}].selector`)
      if (step.action === "fill") {
        return { action: "fill", selector, value: nonEmpty(step.value, `${id}.steps[${stepIndex}].value`) }
      }
      if (step.action === "assertText") {
        return { action: "assertText", selector, text: nonEmpty(step.text, `${id}.steps[${stepIndex}].text`) }
      }
      return { action: step.action, selector }
    }) as JourneyStep[]
    return { id, steps }
  })

  return { campaign, port: root.port as number, journeys }
}
