import { buildPrompt, generateAnnouncement } from "./ai"
import { collectReleaseContext } from "./git"
import { publishDiscordAnnouncement } from "./publishers/discord"
import type { ReleaseInput } from "./shared/types"

export async function sendReleaseNotesForRange(input: ReleaseInput) {
  if (!input.config.branches.includes(input.branchName)) {
    input.logger.log(`Skipping release message for unsupported branch ${input.branchName}`)
    return { sent: false as const, reason: "unsupported-branch" as const }
  }

  const context = await collectReleaseContext({
    from: input.from,
    to: input.to,
    config: input.config,
  })

  input.logger.log(`Generating AI release notes for diff between ${input.from} and ${input.to}`)
  input.logger.log(`Changed files: ${context.changedFiles.length}`)
  input.logger.log(`Patch length: ${context.patch.length}`)

  const prompt = buildPrompt({
    version: input.version,
    releaseNotes: input.releaseNotes,
    diffStat: context.diffStat,
    commitList: context.commitList,
    changedFiles: context.changedFiles,
    patch: context.patch,
  })

  const announcement = await generateAnnouncement({
    gatewayApiKey: input.config.gatewayApiKey,
    model: input.config.model,
    prompt,
    logger: input.logger,
  })

  return await publishDiscordAnnouncement({
    webhookUrl: input.config.discordWebhookUrl,
    announcement,
    branchName: input.branchName,
    dryRun: input.config.dryRun,
    logger: input.logger,
  })
}
