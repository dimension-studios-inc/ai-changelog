import { describe, expect, it, vi } from "vitest"

import { publishSlackAnnouncement } from "../src/publishers/slack"

describe("publishSlackAnnouncement", () => {
  it("skips empty announcements", async () => {
    const fetchImpl = vi.fn()

    const result = await publishSlackAnnouncement({
      webhookUrl: "https://slack.example/webhook",
      announcement: { title: "", description: "" },
      branchName: "main",
      version: "1.2.3",
      dryRun: false,
      logger: console,
      fetchImpl,
    })

    expect(result).toEqual({ sent: false, reason: "empty-output" })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it("posts Block Kit payloads to Slack", async () => {
    const fetchImpl = vi.fn(async () => new Response("ok", { status: 200 }))

    const result = await publishSlackAnnouncement({
      webhookUrl: "https://slack.example/webhook",
      announcement: { title: "Release", description: "Shipped" },
      branchName: "main",
      version: "1.2.3",
      dryRun: false,
      logger: console,
      fetchImpl,
    })

    expect(result).toEqual({ sent: true })
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://slack.example/webhook",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          text: "Release\n\nShipped",
          blocks: [
            {
              type: "header",
              text: { type: "plain_text", text: "Release", emoji: true },
            },
            {
              type: "section",
              text: { type: "mrkdwn", text: "Shipped" },
            },
            {
              type: "context",
              elements: [{ type: "mrkdwn", text: "*Version:* 1.2.3  *Branch:* main" }],
            },
          ],
        }),
      })
    )
  })

  it("does not post in dry run", async () => {
    const fetchImpl = vi.fn()

    const result = await publishSlackAnnouncement({
      webhookUrl: "https://slack.example/webhook",
      announcement: { title: "Release", description: "Shipped" },
      branchName: "main",
      version: "1.2.3",
      dryRun: true,
      logger: console,
      fetchImpl,
    })

    expect(result).toEqual({ sent: false, reason: "dry-run" })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it("truncates Slack block and fallback text", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
      return new Response("ok", { status: 200 })
    })

    await publishSlackAnnouncement({
      webhookUrl: "https://slack.example/webhook",
      announcement: { title: "x".repeat(200), description: "y".repeat(5000) },
      branchName: "beta",
      version: "1.2.3-beta.1",
      dryRun: false,
      logger: console,
      fetchImpl,
    })

    const request = fetchImpl.mock.calls[0]?.[1]
    const body = JSON.parse(String(request?.body))

    expect(body.text).toHaveLength(4000)
    expect(body.blocks[0].text.text).toHaveLength(150)
    expect(body.blocks[1].text.text).toHaveLength(3000)
    expect(body.blocks[1].text.text).toContain("[...truncated...]")
  })

  it("throws provider-specific webhook errors", async () => {
    const fetchImpl = vi.fn(async () => new Response("missing webhook", { status: 404 }))

    await expect(
      publishSlackAnnouncement({
        webhookUrl: "https://slack.example/webhook",
        announcement: { title: "Release", description: "Shipped" },
        branchName: "main",
        version: "1.2.3",
        dryRun: false,
        logger: console,
        fetchImpl,
      })
    ).rejects.toThrow("Slack webhook failed: 404 missing webhook")
  })
})
