import type { Announcement, Publisher, ReleaseNotesLogger } from "../shared/types"

const SLACK_HEADER_LIMIT = 150
const SLACK_SECTION_LIMIT = 3000
const SLACK_FALLBACK_LIMIT = 4000
const TRUNCATION_SUFFIX = "\n\n[...truncated...]"

function clamp(text: string, maxLength: number) {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - TRUNCATION_SUFFIX.length)}${TRUNCATION_SUFFIX}`
}

function buildFallbackText(announcement: Announcement) {
  return clamp(`${announcement.title}\n\n${formatSlackMrkdwn(announcement.description)}`, SLACK_FALLBACK_LIMIT)
}

function formatInlineMarkdown(text: string) {
  return text.replace(/\*\*([^*]+)\*\*/g, "*$1*")
}

function formatSlackMrkdwn(markdown: string) {
  return markdown
    .split("\n")
    .map((line) => {
      const heading = line.match(/^#{1,6}\s+(.+)$/)
      if (heading?.[1]) return `*${formatInlineMarkdown(heading[1].trim())}*`

      const bullet = line.match(/^(\s*)[-*]\s+(.+)$/)
      if (bullet?.[2]) return `${bullet[1] ?? ""}• ${formatInlineMarkdown(bullet[2])}`

      return formatInlineMarkdown(line)
    })
    .join("\n")
}

function buildSlackPayload({
  announcement,
  branchName,
  version,
}: {
  announcement: Announcement
  branchName: string
  version: string
}) {
  return {
    text: buildFallbackText(announcement),
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: clamp(announcement.title, SLACK_HEADER_LIMIT),
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: clamp(formatSlackMrkdwn(announcement.description), SLACK_SECTION_LIMIT),
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `*Version:* ${version}  *Branch:* ${branchName}`,
          },
        ],
      },
    ],
  }
}

export async function publishSlackAnnouncement({
  webhookUrl,
  announcement,
  branchName,
  version,
  dryRun,
  logger,
  fetchImpl = fetch,
}: {
  webhookUrl: string
  announcement: Announcement
  branchName: string
  version: string
  dryRun: boolean
  logger: ReleaseNotesLogger
  fetchImpl?: typeof fetch
}) {
  if (!(announcement.title.trim() && announcement.description.trim())) {
    logger.log("Skipping Slack release message because the AI output was empty")
    return { sent: false as const, reason: "empty-output" as const }
  }

  const payload = buildSlackPayload({ announcement, branchName, version })

  if (dryRun) {
    logger.log(`Dry run enabled; would send Slack release message: ${JSON.stringify(payload)}`)
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
    throw new Error(`Slack webhook failed: ${response.status} ${body}`)
  }

  logger.log("Sent Slack release message")
  return { sent: true as const }
}

export function createSlackPublisher({
  webhookUrl,
  fetchImpl,
}: {
  webhookUrl: string
  fetchImpl?: typeof fetch
}): Publisher {
  return {
    name: "slack",
    publish(input) {
      return publishSlackAnnouncement({
        webhookUrl,
        announcement: input.announcement,
        branchName: input.branchName,
        version: input.version,
        dryRun: input.dryRun,
        logger: input.logger,
        fetchImpl,
      })
    },
  }
}
