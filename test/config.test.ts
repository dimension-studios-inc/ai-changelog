import { afterEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_PROMPT } from "../src/ai"
import { DEFAULT_EXCLUDE_PATHS, DEFAULT_MODEL, resolveConfig } from "../src/config"

describe("resolveConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("reads required values from plugin config", () => {
    const config = resolveConfig({
      discordWebhookUrl: "https://discord.example/webhook",
      slackWebhookUrl: "https://slack.example/webhook",
      gatewayApiKey: "gateway-key",
      dryRun: true,
    })

    expect(config.discordWebhookUrl).toBe("https://discord.example/webhook")
    expect(config.slackWebhookUrl).toBe("https://slack.example/webhook")
    expect(config.gatewayApiKey).toBe("gateway-key")
    expect(config.model).toBe(DEFAULT_MODEL)
    expect(config.prompt).toBe(DEFAULT_PROMPT)
    expect(config.branches).toEqual(["main-release", "beta-release"])
    expect(config.excludePaths).toEqual(DEFAULT_EXCLUDE_PATHS)
  })

  it("falls back to environment variables", () => {
    vi.stubEnv("AI_CHANGELOG_DISCORD_WEBHOOK", "https://discord.example/env")
    vi.stubEnv("AI_CHANGELOG_SLACK_WEBHOOK", "https://slack.example/env")
    vi.stubEnv("AI_GATEWAY_API_KEY", "gateway-env")
    vi.stubEnv("AI_CHANGELOG_MODEL", "xai/grok-3-beta")

    const config = resolveConfig({})

    expect(config.discordWebhookUrl).toBe("https://discord.example/env")
    expect(config.slackWebhookUrl).toBe("https://slack.example/env")
    expect(config.gatewayApiKey).toBe("gateway-env")
    expect(config.model).toBe("xai/grok-3-beta")
    expect(config.prompt).toBe(DEFAULT_PROMPT)
  })

  it("reads custom prompts from plugin config", () => {
    const config = resolveConfig({
      discordWebhookUrl: "https://discord.example/webhook",
      prompt: "Write release notes for customer success teams.",
    })

    expect(config.prompt).toBe("Write release notes for customer success teams.")
  })

  it("allows missing webhook in dry run", () => {
    const config = resolveConfig({ dryRun: true })

    expect(config.discordWebhookUrl).toBeUndefined()
    expect(config.slackWebhookUrl).toBeUndefined()
    expect(config.model).toBe(DEFAULT_MODEL)
  })

  it("allows Slack-only configuration", () => {
    const config = resolveConfig({
      slackWebhookUrl: "https://slack.example/webhook",
    })

    expect(config.discordWebhookUrl).toBeUndefined()
    expect(config.slackWebhookUrl).toBe("https://slack.example/webhook")
  })

  it("does not read generic Discord webhook environment variables", () => {
    vi.stubEnv("DISCORD_WEBHOOK", "https://discord.example/generic")

    expect(() => resolveConfig({})).toThrow("Missing notification webhook URL")
  })

  it("requires at least one webhook outside dry run", () => {
    expect(() => resolveConfig({})).toThrow("Missing notification webhook URL")
  })

  it("rejects empty configured webhook strings", () => {
    expect(() => resolveConfig({ discordWebhookUrl: "" })).toThrow()
    expect(() => resolveConfig({ slackWebhookUrl: "   " })).toThrow()
    expect(() => resolveConfig({ prompt: "" })).toThrow()
  })
})
