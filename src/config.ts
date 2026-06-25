import type { GatewayModelId } from "@ai-sdk/gateway"
import * as z from "zod"

import { DEFAULT_PROMPT } from "./ai"
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

export const DEFAULT_MODEL = "openai/gpt-5.4-nano" satisfies GatewayModelId

const nonEmptyStringSchema = z.string().trim().min(1)
const gatewayModelSchema = nonEmptyStringSchema.transform((value) => value as GatewayModelId)

const pluginConfigSchema = z.object({
  discordWebhookUrl: nonEmptyStringSchema.optional(),
  slackWebhookUrl: nonEmptyStringSchema.optional(),
  gatewayApiKey: nonEmptyStringSchema.optional(),
  model: gatewayModelSchema.optional(),
  prompt: nonEmptyStringSchema.optional(),
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
  const discordWebhookUrl = parsed.discordWebhookUrl ?? readEnv("AI_CHANGELOG_DISCORD_WEBHOOK")
  const slackWebhookUrl = parsed.slackWebhookUrl ?? readEnv("AI_CHANGELOG_SLACK_WEBHOOK")
  const gatewayApiKey = parsed.gatewayApiKey ?? readEnv("AI_GATEWAY_API_KEY")
  const model = parsed.model ?? readEnv("AI_CHANGELOG_MODEL") ?? DEFAULT_MODEL
  const prompt = parsed.prompt ?? DEFAULT_PROMPT

  if (!(discordWebhookUrl || slackWebhookUrl || parsed.dryRun)) {
    throw new Error(
      "Missing notification webhook URL. Set discordWebhookUrl, slackWebhookUrl, " +
        "AI_CHANGELOG_DISCORD_WEBHOOK, or AI_CHANGELOG_SLACK_WEBHOOK."
    )
  }

  return {
    discordWebhookUrl,
    slackWebhookUrl,
    gatewayApiKey,
    model,
    prompt,
    branches: parsed.branches ?? ["main-release", "beta-release"],
    includePaths: parsed.includePaths ?? [],
    excludePaths: [...DEFAULT_EXCLUDE_PATHS, ...(parsed.excludePaths ?? [])],
    dryRun: parsed.dryRun ?? false,
  }
}
