import { buildPrompt, generateAnnouncement } from "./ai"
import { collectReleaseContext } from "./git"
import { createDiscordPublisher } from "./publishers/discord"
import { createSlackPublisher } from "./publishers/slack"
import type { Publisher, PublisherResult, ReleaseInput, ResolvedConfig } from "./shared/types"

function createPublishers(config: ResolvedConfig): Publisher[] {
  const publishers: Publisher[] = []

  if (config.discordWebhookUrl) {
    publishers.push(createDiscordPublisher({ webhookUrl: config.discordWebhookUrl }))
  }

  if (config.slackWebhookUrl) {
    publishers.push(createSlackPublisher({ webhookUrl: config.slackWebhookUrl }))
  }

  if (publishers.length === 0 && config.dryRun) {
    publishers.push(createDiscordPublisher({ webhookUrl: "dry-run" }))
  }

  return publishers
}

function combinePublisherResults(results: PublisherResult[]) {
  if (results.some((result) => result.sent)) return { sent: true as const }

  return results[0] ?? { sent: false as const, reason: "empty-output" as const }
}

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
    systemPrompt: input.config.prompt,
    logger: input.logger,
  })

  const publishers = createPublishers(input.config)
  const results = await Promise.all(
    publishers.map((publisher) =>
      publisher.publish({
        announcement,
        branchName: input.branchName,
        version: input.version,
        dryRun: input.config.dryRun,
        logger: input.logger,
      })
    )
  )

  return combinePublisherResults(results)
}
