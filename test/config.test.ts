import { describe, expect, it, vi } from "vitest"

import { DEFAULT_EXCLUDE_PATHS, DEFAULT_MODEL, resolveConfig } from "../src/config"

describe("resolveConfig", () => {
  it("reads required values from plugin config", () => {
    const config = resolveConfig({
      discordWebhookUrl: "https://discord.example/webhook",
      gatewayApiKey: "gateway-key",
      dryRun: true,
    })

    expect(config.discordWebhookUrl).toBe("https://discord.example/webhook")
    expect(config.gatewayApiKey).toBe("gateway-key")
    expect(config.model).toBe(DEFAULT_MODEL)
    expect(config.branches).toEqual(["main", "main-release"])
    expect(config.excludePaths).toEqual(DEFAULT_EXCLUDE_PATHS)
  })

  it("falls back to environment variables", () => {
    vi.stubEnv("AI_CHANGELOG_DISCORD_WEBHOOK", "https://discord.example/env")
    vi.stubEnv("AI_GATEWAY_API_KEY", "gateway-env")
    vi.stubEnv("AI_CHANGELOG_MODEL", "xai/grok-3-beta")

    const config = resolveConfig({})

    expect(config.discordWebhookUrl).toBe("https://discord.example/env")
    expect(config.gatewayApiKey).toBe("gateway-env")
    expect(config.model).toBe("xai/grok-3-beta")

    vi.unstubAllEnvs()
  })

  it("allows missing webhook in dry run", () => {
    const config = resolveConfig({ dryRun: true })

    expect(config.discordWebhookUrl).toBe("dry-run")
    expect(config.model).toBe(DEFAULT_MODEL)

    vi.unstubAllEnvs()
  })
})
