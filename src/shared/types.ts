export type ReleaseNotesLogger = {
  log(message: string): void
  warn(message: string): void
}

export type PluginConfig = {
  discordWebhookUrl?: string
  gatewayApiKey?: string
  model?: string
  branches?: string[]
  includePaths?: string[]
  excludePaths?: string[]
  dryRun?: boolean
}

export type ResolvedConfig = {
  discordWebhookUrl: string
  gatewayApiKey?: string
  model: string
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
