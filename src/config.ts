import * as z from "zod"

import type { ResolvedConfig } from "./shared/types"

export const DEFAULT_EXCLUDE_PATHS = [
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "**/*.snap",
  "**/*.map",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
  "**/*.min.*",
  "**/*.lock",
]

export const DEFAULT_MODEL = "openai/gpt-5.4-nano"

const pluginConfigSchema = z.object({
  discordWebhookUrl: z.string().optional(),
  gatewayApiKey: z.string().optional(),
  model: z.string().optional(),
  branches: z.array(z.string()).optional(),
  includePaths: z.array(z.string()).optional(),
  excludePaths: z.array(z.string()).optional(),
  dryRun: z.boolean().optional(),
})

function readEnv(name: string) {
  // biome-ignore lint/style/noProcessEnv: this is the package's centralized environment fallback.
  return process.env[name]?.trim() || undefined
}

export function resolveConfig(pluginConfig: unknown): ResolvedConfig {
  const parsed = pluginConfigSchema.parse(pluginConfig ?? {})
  const discordWebhookUrl =
    parsed.discordWebhookUrl ?? readEnv("AI_CHANGELOG_DISCORD_WEBHOOK") ?? readEnv("DISCORD_WEBHOOK")
  const gatewayApiKey = parsed.gatewayApiKey ?? readEnv("AI_GATEWAY_API_KEY")
  const model = parsed.model ?? readEnv("AI_CHANGELOG_MODEL") ?? DEFAULT_MODEL

  if (!(discordWebhookUrl || parsed.dryRun)) {
    throw new Error("Missing Discord webhook URL. Set discordWebhookUrl or AI_CHANGELOG_DISCORD_WEBHOOK.")
  }

  return {
    discordWebhookUrl: discordWebhookUrl ?? "dry-run",
    gatewayApiKey,
    model,
    branches: parsed.branches ?? ["main", "main-release"],
    includePaths: parsed.includePaths ?? [],
    excludePaths: [...DEFAULT_EXCLUDE_PATHS, ...(parsed.excludePaths ?? [])],
    dryRun: parsed.dryRun ?? false,
  }
}
