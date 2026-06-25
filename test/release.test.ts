import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const collectReleaseContext = vi.fn()
  const buildPrompt = vi.fn()
  const generateAnnouncement = vi.fn()
  const discordPublish = vi.fn()
  const slackPublish = vi.fn()
  const createDiscordPublisher = vi.fn(() => ({ name: "discord", publish: discordPublish }))
  const createSlackPublisher = vi.fn(() => ({ name: "slack", publish: slackPublish }))

  return {
    buildPrompt,
    collectReleaseContext,
    createDiscordPublisher,
    createSlackPublisher,
    discordPublish,
    generateAnnouncement,
    slackPublish,
  }
})

vi.mock("../src/git", () => ({
  collectReleaseContext: mocks.collectReleaseContext,
}))

vi.mock("../src/ai", () => ({
  buildPrompt: mocks.buildPrompt,
  generateAnnouncement: mocks.generateAnnouncement,
}))

vi.mock("../src/publishers/discord", () => ({
  createDiscordPublisher: mocks.createDiscordPublisher,
}))

vi.mock("../src/publishers/slack", () => ({
  createSlackPublisher: mocks.createSlackPublisher,
}))

describe("sendReleaseNotesForRange", () => {
  beforeEach(() => {
    mocks.collectReleaseContext.mockReset()
    mocks.buildPrompt.mockReset()
    mocks.generateAnnouncement.mockReset()
    mocks.discordPublish.mockReset()
    mocks.slackPublish.mockReset()
    mocks.createDiscordPublisher.mockClear()
    mocks.createSlackPublisher.mockClear()

    mocks.collectReleaseContext.mockResolvedValue({
      diffStat: "stat",
      commitList: "commits",
      changedFiles: ["src/index.ts"],
      patch: "patch",
    })
    mocks.buildPrompt.mockReturnValue("prompt")
    mocks.generateAnnouncement.mockResolvedValue({ title: "Release", description: "Shipped" })
    mocks.discordPublish.mockResolvedValue({ sent: true })
    mocks.slackPublish.mockResolvedValue({ sent: true })
  })

  it("skips unsupported branches before AI generation", async () => {
    const { sendReleaseNotesForRange } = await import("../src/release")

    const result = await sendReleaseNotesForRange({
      from: "from",
      to: "to",
      version: "1.2.3",
      releaseNotes: "notes",
      branchName: "dev",
      logger: console,
      config: {
        discordWebhookUrl: "https://discord.example/webhook",
        model: "xai/grok-3-beta",
        prompt: "system prompt",
        branches: ["main"],
        includePaths: [],
        excludePaths: [],
        dryRun: false,
      },
    })

    expect(result).toEqual({ sent: false, reason: "unsupported-branch" })
    expect(mocks.generateAnnouncement).not.toHaveBeenCalled()
    expect(mocks.discordPublish).not.toHaveBeenCalled()
  })

  it("generates one AI announcement and publishes to all configured publishers", async () => {
    const { sendReleaseNotesForRange } = await import("../src/release")

    const result = await sendReleaseNotesForRange({
      from: "from",
      to: "to",
      version: "1.2.3",
      releaseNotes: "notes",
      branchName: "main",
      logger: console,
      config: {
        discordWebhookUrl: "https://discord.example/webhook",
        slackWebhookUrl: "https://slack.example/webhook",
        gatewayApiKey: "key",
        model: "xai/grok-3-beta",
        prompt: "system prompt",
        branches: ["main"],
        includePaths: [],
        excludePaths: [],
        dryRun: false,
      },
    })

    expect(result).toEqual({ sent: true })
    expect(mocks.generateAnnouncement).toHaveBeenCalledTimes(1)
    expect(mocks.generateAnnouncement).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "prompt",
        systemPrompt: "system prompt",
      })
    )
    expect(mocks.createDiscordPublisher).toHaveBeenCalledWith({ webhookUrl: "https://discord.example/webhook" })
    expect(mocks.createSlackPublisher).toHaveBeenCalledWith({ webhookUrl: "https://slack.example/webhook" })
    expect(mocks.discordPublish).toHaveBeenCalledWith(
      expect.objectContaining({
        announcement: { title: "Release", description: "Shipped" },
        version: "1.2.3",
      })
    )
    expect(mocks.slackPublish).toHaveBeenCalledWith(
      expect.objectContaining({
        announcement: { title: "Release", description: "Shipped" },
        version: "1.2.3",
      })
    )
  })
})
