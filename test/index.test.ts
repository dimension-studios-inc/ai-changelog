import { beforeEach, describe, expect, it, vi } from "vitest"

const sendReleaseNotesForRange = vi.fn()

vi.mock("../src/release", () => ({
  sendReleaseNotesForRange,
}))

describe("semantic-release plugin", () => {
  beforeEach(() => {
    sendReleaseNotesForRange.mockReset()
    sendReleaseNotesForRange.mockResolvedValue({ sent: true })
  })

  it("passes semantic-release context into release sender", async () => {
    const plugin = (await import("../src/index")).default

    await plugin.success(
      {
        discordWebhookUrl: "webhook",
        gatewayApiKey: "key",
        model: "xai/grok-3-beta",
        dryRun: true,
      },
      {
        lastRelease: { gitHead: "from" },
        nextRelease: { gitHead: "to", version: "1.2.3", notes: "notes" },
        branch: { name: "main" },
        logger: console,
      }
    )

    expect(sendReleaseNotesForRange).toHaveBeenCalledWith({
      from: "from",
      to: "to",
      version: "1.2.3",
      releaseNotes: "notes",
      branchName: "main",
      logger: console,
      config: expect.objectContaining({
        discordWebhookUrl: "webhook",
        gatewayApiKey: "key",
        model: "xai/grok-3-beta",
        dryRun: true,
      }),
    })
  })

  it("uses the empty tree for an initial release with no previous git head", async () => {
    const plugin = (await import("../src/index")).default

    await plugin.success(
      {
        discordWebhookUrl: "webhook",
        gatewayApiKey: "key",
        model: "xai/grok-3-beta",
        dryRun: true,
      },
      {
        lastRelease: {},
        nextRelease: { gitHead: "to", version: "1.0.0", notes: "notes" },
        branch: { name: "main" },
        logger: console,
      }
    )

    expect(sendReleaseNotesForRange).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "4b825dc642cb6eb9a060e54bf8d69288fbee4904",
        to: "to",
      })
    )
  })
})
