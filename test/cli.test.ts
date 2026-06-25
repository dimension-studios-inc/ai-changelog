import { mkdtempSync, symlinkSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { describe, expect, it } from "vitest"

import { isCliEntrypoint, parseRetryArgs } from "../src/cli"

describe("parseRetryArgs", () => {
  it("parses retry options", () => {
    expect(
      parseRetryArgs([
        "--version",
        "1.0.0-beta.2",
        "--branch",
        "beta",
        "--publisher",
        "slack",
        "--dry-run",
        "--gateway-api-key",
        "gateway-key",
        "--slack-webhook-url",
        "https://slack.example/webhook",
        "--include-path",
        "src/,packages/",
        "--exclude-path",
        "dist/",
      ])
    ).toEqual(
      expect.objectContaining({
        version: "1.0.0-beta.2",
        branchName: "beta",
        publisher: "slack",
        dryRun: true,
        gatewayApiKey: "gateway-key",
        slackWebhookUrl: "https://slack.example/webhook",
        includePaths: ["src/,packages/"],
        excludePaths: ["dist/"],
      })
    )
  })

  it("requires a branch", () => {
    expect(() => parseRetryArgs(["--version", "1.0.0"])).toThrow("Missing required --branch")
  })

  it("rejects conflicting version and tag options", () => {
    expect(() => parseRetryArgs(["--version", "1.0.0", "--tag", "v1.0.0", "--branch", "main"])).toThrow(
      "Use either --version or --tag, not both"
    )
  })

  it("rejects invalid publisher values", () => {
    expect(() => parseRetryArgs(["--branch", "main", "--publisher", "teams"])).toThrow(
      "--publisher must be one of both, slack, or discord"
    )
  })

  it("detects the CLI entrypoint when npm runs the bin symlink", () => {
    const cliPath = fileURLToPath(new URL("../src/cli.ts", import.meta.url))
    const symlinkPath = join(mkdtempSync(join(tmpdir(), "ai-changelog-cli-")), "ai-changelog")

    symlinkSync(cliPath, symlinkPath)

    expect(isCliEntrypoint(symlinkPath, pathToFileURL(cliPath).href)).toBe(true)
  })
})
