import { describe, expect, it, vi } from "vitest"

import { buildPrompt, generateAnnouncement } from "../src/ai"

const mocks = vi.hoisted(() => {
  const generateText = vi.fn()
  const gatewayModel = vi.fn((model: string) => ({ model }))
  const createGateway = vi.fn(() => gatewayModel)

  return { createGateway, gatewayModel, generateText }
})

vi.mock("ai", () => ({
  generateText: mocks.generateText,
  Output: {
    object: vi.fn((options) => ({ kind: "object", ...options })),
  },
}))

vi.mock("@ai-sdk/gateway", () => ({
  createGateway: mocks.createGateway,
}))

describe("ai", () => {
  it("builds a prompt from release context", () => {
    const prompt = buildPrompt({
      version: "1.2.3",
      releaseNotes: "notes",
      diffStat: "stat",
      commitList: "commits",
      changedFiles: ["src/index.ts"],
      patch: "patch",
    })

    expect(prompt).toContain("Version: 1.2.3")
    expect(prompt).toContain("Existing release notes:")
    expect(prompt).toContain("Changed files:")
  })

  it("generates an announcement with the AI SDK gateway provider", async () => {
    mocks.generateText.mockResolvedValue({ output: { title: "Release", description: "Shipped" } })

    const announcement = await generateAnnouncement({
      gatewayApiKey: "key",
      model: "xai/grok-3-beta",
      prompt: "prompt",
      logger: console,
    })

    expect(announcement).toEqual({ title: "Release", description: "Shipped" })
    expect(mocks.createGateway).toHaveBeenCalledWith({ apiKey: "key" })
    expect(mocks.gatewayModel).toHaveBeenCalledWith("xai/grok-3-beta")
    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: { model: "xai/grok-3-beta" },
        output: expect.objectContaining({ kind: "object" }),
        prompt: "prompt",
      })
    )
  })
})
