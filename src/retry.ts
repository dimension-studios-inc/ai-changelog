import type { GatewayModelId } from "@ai-sdk/gateway"

import { DEFAULT_MODEL, resolveConfig } from "./config"
import type { GitRunner } from "./git"
import { runGit } from "./git"
import { sendReleaseNotesForRange } from "./release"
import type { PluginConfig, ReleaseNotesLogger, ResolvedConfig } from "./shared/types"

const EMPTY_TREE_GIT_HEAD = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"

export type PublisherSelection = "both" | "discord" | "slack"

export type RetryOptions = {
  version?: string
  tag?: string
  branchName: string
  publisher: PublisherSelection
  dryRun?: boolean
  discordWebhookUrl?: string
  slackWebhookUrl?: string
  gatewayApiKey?: string
  model?: GatewayModelId
  prompt?: string
  includePaths?: string[]
  excludePaths?: string[]
}

type RetryReleaseContext = {
  tag: string
  version: string
  from: string
  to: string
  releaseNotes: string
}

function trimLeadingV(value: string) {
  return value.replace(/^v/, "")
}

async function resolveReleaseTag({ version, tag, git }: { version?: string; tag?: string; git: GitRunner }) {
  if (tag) return tag
  if (version) return `v${trimLeadingV(version)}`
  return await git(["describe", "--tags", "--abbrev=0"])
}

function resolveReleaseVersion({ version, tag }: { version?: string; tag: string }) {
  return version ?? trimLeadingV(tag)
}

function normalizeList(values: string[] | undefined) {
  return values
    ?.flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean)
}

function extractReleaseNotes(commitMessage: string) {
  return commitMessage.split("\n").slice(1).join("\n").trim()
}

async function maybeRunGit(git: GitRunner, args: string[]) {
  try {
    return await git(args)
  } catch {
    return undefined
  }
}

export async function resolveRetryReleaseContext({
  version,
  tag,
  git = runGit,
}: {
  version?: string
  tag?: string
  git?: GitRunner
}): Promise<RetryReleaseContext> {
  const releaseTag = await resolveReleaseTag({ version, tag, git })
  const releaseVersion = resolveReleaseVersion({ version, tag: releaseTag })
  const to = await git(["rev-list", "-n", "1", releaseTag])
  const from = (await maybeRunGit(git, ["describe", "--tags", "--abbrev=0", `${releaseTag}^`])) ?? EMPTY_TREE_GIT_HEAD
  const releaseNotes = extractReleaseNotes(await git(["show", "-s", "--format=%B", releaseTag]))

  return {
    tag: releaseTag,
    version: releaseVersion,
    from,
    to,
    releaseNotes,
  }
}

function buildPluginConfig(options: RetryOptions): PluginConfig {
  return {
    discordWebhookUrl: options.discordWebhookUrl,
    slackWebhookUrl: options.slackWebhookUrl,
    gatewayApiKey: options.gatewayApiKey,
    model: options.model,
    prompt: options.prompt,
    branches: [options.branchName],
    includePaths: normalizeList(options.includePaths),
    excludePaths: normalizeList(options.excludePaths),
    dryRun: options.dryRun,
  }
}

function selectPublishers(config: ResolvedConfig, publisher: PublisherSelection): ResolvedConfig {
  return {
    ...config,
    discordWebhookUrl: publisher === "slack" ? undefined : config.discordWebhookUrl,
    slackWebhookUrl: publisher === "discord" ? undefined : config.slackWebhookUrl,
  }
}

export async function retryReleaseAnnouncement({
  options,
  logger,
  git = runGit,
}: {
  options: RetryOptions
  logger: ReleaseNotesLogger
  git?: GitRunner
}) {
  const release = await resolveRetryReleaseContext({
    version: options.version,
    tag: options.tag,
    git,
  })
  const config = selectPublishers(resolveConfig(buildPluginConfig(options)), options.publisher)

  if (!(config.dryRun || config.discordWebhookUrl || config.slackWebhookUrl)) {
    throw new Error(`Missing ${options.publisher} webhook URL for retry`)
  }

  logger.log(`Retrying AI changelog notification for ${release.tag}`)

  return await sendReleaseNotesForRange({
    from: release.from,
    to: release.to,
    version: release.version,
    releaseNotes: release.releaseNotes,
    branchName: options.branchName,
    logger,
    config,
  })
}

export { DEFAULT_MODEL }
