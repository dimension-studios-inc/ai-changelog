import type { GatewayModelId } from "@ai-sdk/gateway"
import { createGateway } from "@ai-sdk/gateway"
import { generateText, Output } from "ai"
import * as z from "zod"

import type { Announcement, ReleaseNotesLogger } from "./shared/types"

const announcementSchema = z.object({
  title: z.string(),
  description: z.string(),
})

const MAX_PATCH_CHARS = 120_000
export const DEFAULT_PROMPT =
  "Generate concise, professional release notes for non-developer readers. " +
  "Only mention user-facing changes. Group content naturally. " +
  "If there are no user-facing changes, return empty strings."

function clamp(text: string, maxChars: number) {
  if (text.length <= maxChars) return text
  return `${text.slice(0, maxChars)}\n\n[...truncated...]`
}

export function buildPrompt({
  version,
  releaseNotes,
  diffStat,
  commitList,
  changedFiles,
  patch,
}: {
  version: string
  releaseNotes: string
  diffStat: string
  commitList: string
  changedFiles: string[]
  patch: string
}) {
  return [
    `Version: ${version}`,
    releaseNotes.trim() ? `Existing release notes:\n${clamp(releaseNotes, 6_000)}` : "",
    diffStat.trim() ? `Diffstat:\n${clamp(diffStat, 6_000)}` : "",
    commitList.trim() ? `Commits:\n${clamp(commitList, 8_000)}` : "",
    changedFiles.length ? `Changed files:\n${clamp(changedFiles.join("\n"), 6_000)}` : "",
    patch.trim() ? `Patch diff:\n${clamp(patch, MAX_PATCH_CHARS)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")
}

export async function generateAnnouncement({
  gatewayApiKey,
  model,
  prompt,
  systemPrompt,
  logger,
}: {
  gatewayApiKey?: string
  model: GatewayModelId
  prompt: string
  systemPrompt: string
  logger: ReleaseNotesLogger
}): Promise<Announcement> {
  logger.log(`Generating AI changelog announcement with ${model}`)

  const gateway = createGateway({ apiKey: gatewayApiKey })
  const { output } = await generateText({
    model: gateway(model),
    system: systemPrompt,
    prompt,
    output: Output.object({ schema: announcementSchema }),
  })

  return output
}
