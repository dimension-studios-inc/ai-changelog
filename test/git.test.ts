import { describe, expect, it, vi } from "vitest"

import { collectReleaseContext, isIncludedPath } from "../src/git"
import type { ResolvedConfig } from "../src/shared/types"

const config: ResolvedConfig = {
  discordWebhookUrl: "webhook",
  gatewayApiKey: "key",
  model: "xai/grok-3-beta",
  branches: ["main"],
  includePaths: ["src/"],
  excludePaths: ["src/generated/"],
  dryRun: false,
}

describe("git helpers", () => {
  it("filters included paths", () => {
    expect(isIncludedPath("src/index.ts", config)).toBe(true)
    expect(isIncludedPath("docs/readme.md", config)).toBe(false)
    expect(isIncludedPath("src/generated/schema.ts", config)).toBe(false)
  })

  it("collects release context with include and exclude args", async () => {
    const git = vi.fn(async (args: string[]) => {
      if (args.includes("--stat")) return "stat"
      if (args.includes("--oneline")) return "abc feat: test"
      if (args.includes("--name-only")) return "src/index.ts\nsrc/generated/schema.ts\n"
      return "patch"
    })

    const context = await collectReleaseContext({
      from: "from",
      to: "to",
      config,
      git,
    })

    expect(context).toEqual({
      diffStat: "stat",
      commitList: "abc feat: test",
      changedFiles: ["src/index.ts"],
      patch: "patch",
    })
    expect(git).toHaveBeenCalledWith(["diff", "from..to", "--name-only", "--", "src/", ":(exclude)src/generated/"])
  })
})
