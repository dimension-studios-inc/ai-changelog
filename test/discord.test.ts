import { describe, expect, it, vi } from "vitest"

import { publishDiscordAnnouncement } from "../src/publishers/discord"

describe("publishDiscordAnnouncement", () => {
  it("skips empty announcements", async () => {
    const fetchImpl = vi.fn()

    const result = await publishDiscordAnnouncement({
      webhookUrl: "https://discord.example/webhook",
      announcement: { title: "", description: "" },
      branchName: "main",
      dryRun: false,
      logger: console,
      fetchImpl,
    })

    expect(result).toEqual({ sent: false, reason: "empty-output" })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it("posts valid announcements to Discord", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }))

    const result = await publishDiscordAnnouncement({
      webhookUrl: "https://discord.example/webhook",
      announcement: { title: "Release", description: "Shipped" },
      branchName: "main",
      dryRun: false,
      logger: console,
      fetchImpl,
    })

    expect(result).toEqual({ sent: true })
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://discord.example/webhook",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          embeds: [{ title: "Release", description: "Shipped", color: 0x0099ff }],
        }),
      })
    )
  })

  it("does not post in dry run", async () => {
    const fetchImpl = vi.fn()

    const result = await publishDiscordAnnouncement({
      webhookUrl: "https://discord.example/webhook",
      announcement: { title: "Release", description: "Shipped" },
      branchName: "main",
      dryRun: true,
      logger: console,
      fetchImpl,
    })

    expect(result).toEqual({ sent: false, reason: "dry-run" })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it("truncates long descriptions", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
      return new Response(null, { status: 204 })
    })

    await publishDiscordAnnouncement({
      webhookUrl: "https://discord.example/webhook",
      announcement: { title: "Release", description: "x".repeat(5000) },
      branchName: "beta",
      dryRun: false,
      logger: console,
      fetchImpl,
    })

    const request = fetchImpl.mock.calls[0]?.[1]
    const body = JSON.parse(String(request?.body))

    expect(body.embeds[0].description).toHaveLength(4096)
    expect(body.embeds[0].description).toContain("[...truncated...]")
    expect(body.embeds[0].color).toBe(0x808080)
  })

  it("throws provider-specific webhook errors", async () => {
    const fetchImpl = vi.fn(async () => new Response("missing webhook", { status: 404 }))

    await expect(
      publishDiscordAnnouncement({
        webhookUrl: "https://discord.example/webhook",
        announcement: { title: "Release", description: "Shipped" },
        branchName: "main",
        dryRun: false,
        logger: console,
        fetchImpl,
      })
    ).rejects.toThrow("Discord webhook failed: 404 missing webhook")
  })
})
