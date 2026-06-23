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
})
