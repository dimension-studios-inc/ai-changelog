import type { GatewayModelId } from "@ai-sdk/gateway"

export type ReleaseNotesLogger = {
  log(message: string): void
  warn(message: string): void
}

export type PluginConfig = {
  discordWebhookUrl?: string
  slackWebhookUrl?: string
  gatewayApiKey?: string
  model?: GatewayModelId
  prompt?: string
  branches?: string[]
  includePaths?: string[]
  excludePaths?: string[]
  dryRun?: boolean
}

export type ResolvedConfig = {
  discordWebhookUrl?: string
  slackWebhookUrl?: string
  gatewayApiKey?: string
  model: GatewayModelId
  prompt: string
  branches: string[]
  includePaths: string[]
  excludePaths: string[]
  dryRun: boolean
}

export type Announcement = {
  title: string
  description: string
}

export type ReleaseInput = {
  from: string
  to: string
  version: string
  releaseNotes: string
  branchName: string
  logger: ReleaseNotesLogger
  config: ResolvedConfig
}

export type PublisherResult =
  | { sent: true }
  | { sent: false; reason: "dry-run" | "empty-output" | "unsupported-branch" }

export type PublisherInput = {
  announcement: Announcement
  branchName: string
  version: string
  dryRun: boolean
  logger: ReleaseNotesLogger
}

export type Publisher = {
  name: string
  publish(input: PublisherInput): Promise<PublisherResult>
}
