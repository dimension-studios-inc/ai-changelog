import type { Announcement, Publisher, ReleaseNotesLogger } from "../shared/types"

const DISCORD_DESCRIPTION_LIMIT = 4096
const TRUNCATION_SUFFIX = "\n\n[...truncated...]"

function clampDescription(description: string) {
  if (description.length <= DISCORD_DESCRIPTION_LIMIT) return description
  return `${description.slice(0, DISCORD_DESCRIPTION_LIMIT - TRUNCATION_SUFFIX.length)}${TRUNCATION_SUFFIX}`
}

export async function publishDiscordAnnouncement({
  webhookUrl,
  announcement,
  branchName,
  dryRun,
  logger,
  fetchImpl = fetch,
}: {
  webhookUrl: string
  announcement: Announcement
  branchName: string
  dryRun: boolean
  logger: ReleaseNotesLogger
  fetchImpl?: typeof fetch
}) {
  if (!(announcement.title.trim() && announcement.description.trim())) {
    logger.log("Skipping Discord release message because the AI output was empty")
    return { sent: false as const, reason: "empty-output" as const }
  }

  const payload = {
    embeds: [
      {
        title: announcement.title,
        description: clampDescription(announcement.description),
        color: branchName === "main" || branchName === "main-release" ? 0x0099ff : 0x808080,
      },
    ],
  }

  if (dryRun) {
    logger.log(`Dry run enabled; would send Discord release message: ${JSON.stringify(payload)}`)
    return { sent: false as const, reason: "dry-run" as const }
  }

  const response = await fetchImpl(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Discord webhook failed: ${response.status} ${body}`)
  }

  logger.log("Sent Discord release message")
  return { sent: true as const }
}

export function createDiscordPublisher({
  webhookUrl,
  fetchImpl,
}: {
  webhookUrl: string
  fetchImpl?: typeof fetch
}): Publisher {
  return {
    name: "discord",
    publish(input) {
      return publishDiscordAnnouncement({
        webhookUrl,
        announcement: input.announcement,
        branchName: input.branchName,
        dryRun: input.dryRun,
        logger: input.logger,
        fetchImpl,
      })
    },
  }
}
