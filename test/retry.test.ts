import { afterEach, describe, expect, it, vi } from "vitest"

const sendReleaseNotesForRange = vi.fn()

vi.mock("../src/release", () => ({
  sendReleaseNotesForRange,
}))

describe("retry release announcements", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    sendReleaseNotesForRange.mockReset()
  })

  it("resolves a retry range from an explicit version", async () => {
    const { resolveRetryReleaseContext } = await import("../src/retry")
    const git = vi.fn(async (args: string[]) => {
      if (args[0] === "rev-list") return "to-sha"
      if (args[0] === "describe") return "v1.0.0-beta.1"
      if (args[0] === "show") return "chore(release): 1.0.0-beta.2 [skip ci]\n\nrelease notes"
      return ""
    })

    const context = await resolveRetryReleaseContext({
      version: "1.0.0-beta.2",
      git,
    })

    expect(context).toEqual({
      tag: "v1.0.0-beta.2",
      version: "1.0.0-beta.2",
      from: "v1.0.0-beta.1",
      to: "to-sha",
      releaseNotes: "release notes",
    })
    expect(git).toHaveBeenCalledWith(["rev-list", "-n", "1", "v1.0.0-beta.2"])
    expect(git).toHaveBeenCalledWith(["describe", "--tags", "--abbrev=0", "v1.0.0-beta.2^"])
  })

  it("uses latest tag and empty tree fallback for an initial release", async () => {
    const { resolveRetryReleaseContext } = await import("../src/retry")
    const git = vi.fn(async (args: string[]) => {
      if (args.join(" ") === "describe --tags --abbrev=0") return "v1.0.0"
      if (args[0] === "rev-list") return "to-sha"
      if (args[0] === "describe") throw new Error("no previous tag")
      if (args[0] === "show") return "chore(release): 1.0.0 [skip ci]\n\nfirst notes"
      return ""
    })

    const context = await resolveRetryReleaseContext({ git })

    expect(context).toEqual({
      tag: "v1.0.0",
      version: "1.0.0",
      from: "4b825dc642cb6eb9a060e54bf8d69288fbee4904",
      to: "to-sha",
      releaseNotes: "first notes",
    })
  })

  it("filters publishers and configures the selected branch for retries", async () => {
    vi.stubEnv("AI_CHANGELOG_DISCORD_WEBHOOK", "https://discord.example/webhook")
    vi.stubEnv("AI_CHANGELOG_SLACK_WEBHOOK", "https://slack.example/webhook")
    sendReleaseNotesForRange.mockResolvedValue({ sent: true })

    const { retryReleaseAnnouncement } = await import("../src/retry")
    const git = vi.fn(async (args: string[]) => {
      if (args[0] === "rev-list") return "to-sha"
      if (args[0] === "describe") return "v1.0.0"
      if (args[0] === "show") return "chore(release): 1.1.0 [skip ci]\n\nrelease notes"
      return ""
    })

    await retryReleaseAnnouncement({
      options: {
        version: "1.1.0",
        branchName: "beta",
        publisher: "slack",
      },
      logger: console,
      git,
    })

    expect(sendReleaseNotesForRange).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "v1.0.0",
        to: "to-sha",
        version: "1.1.0",
        releaseNotes: "release notes",
        branchName: "beta",
        config: expect.objectContaining({
          discordWebhookUrl: undefined,
          slackWebhookUrl: "https://slack.example/webhook",
          branches: ["beta"],
        }),
      })
    )
  })

  it("throws when the selected publisher has no webhook after filtering", async () => {
    vi.stubEnv("AI_CHANGELOG_DISCORD_WEBHOOK", "https://discord.example/webhook")

    const { retryReleaseAnnouncement } = await import("../src/retry")
    const git = vi.fn(async (args: string[]) => {
      if (args[0] === "rev-list") return "to-sha"
      if (args[0] === "describe") return "v1.0.0"
      if (args[0] === "show") return "chore(release): 1.1.0 [skip ci]\n\nrelease notes"
      return ""
    })

    await expect(
      retryReleaseAnnouncement({
        options: {
          version: "1.1.0",
          branchName: "beta",
          publisher: "slack",
        },
        logger: console,
        git,
      })
    ).rejects.toThrow("Missing slack webhook URL for retry")
  })
})
