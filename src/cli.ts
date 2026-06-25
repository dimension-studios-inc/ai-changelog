#!/usr/bin/env node

import { fileURLToPath } from "node:url"
import type { GatewayModelId } from "@ai-sdk/gateway"

import { DEFAULT_MODEL, type PublisherSelection, type RetryOptions, retryReleaseAnnouncement } from "./retry"

const publisherSelections = new Set<PublisherSelection>(["both", "discord", "slack"])

function readValue(args: string[], index: number, flag: string) {
  const value = args[index + 1]
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}`)
  }

  return value
}

function readBoolean(value: string | undefined) {
  if (value === undefined) return true
  if (value === "true") return true
  if (value === "false") return false
  throw new Error(`Expected boolean value, received ${value}`)
}

function readOptionalValue(args: string[], index: number) {
  const value = args[index + 1]
  if (!value || value.startsWith("--")) return undefined
  return value
}

function printRetryHelp() {
  console.info(`Usage: ai-changelog retry [options]

Options:
  --version <version>          Release version, for example 1.0.0-beta.2
  --tag <tag>                  Release tag, for example v1.0.0-beta.2
  --branch <branch>            Branch name to show in notification metadata
  --publisher <target>         both, slack, or discord (default: both)
  --dry-run [true|false]       Generate payloads without posting
  --gateway-api-key <key>      Override AI_GATEWAY_API_KEY
  --discord-webhook-url <url>  Override AI_CHANGELOG_DISCORD_WEBHOOK
  --slack-webhook-url <url>    Override AI_CHANGELOG_SLACK_WEBHOOK
  --model <model>              AI Gateway model (default: ${DEFAULT_MODEL})
  --prompt <prompt>            Override the system prompt
  --include-path <path>        Include git path; repeat or comma-separate
  --exclude-path <path>        Exclude git path; repeat or comma-separate
  --help                       Show this help
`)
}

export function parseRetryArgs(args: string[]): RetryOptions {
  const parsed: RetryOptions = {
    branchName: "",
    publisher: "both",
    model: DEFAULT_MODEL,
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    switch (arg) {
      case "--version":
        parsed.version = readValue(args, index, arg)
        index += 1
        break
      case "--tag":
        parsed.tag = readValue(args, index, arg)
        index += 1
        break
      case "--branch":
        parsed.branchName = readValue(args, index, arg)
        index += 1
        break
      case "--publisher": {
        const publisher = readValue(args, index, arg) as PublisherSelection
        if (!publisherSelections.has(publisher)) {
          throw new Error("--publisher must be one of both, slack, or discord")
        }
        parsed.publisher = publisher
        index += 1
        break
      }
      case "--dry-run": {
        const value = readOptionalValue(args, index)
        parsed.dryRun = readBoolean(value)
        if (value) index += 1
        break
      }
      case "--gateway-api-key":
        parsed.gatewayApiKey = readValue(args, index, arg)
        index += 1
        break
      case "--discord-webhook-url":
        parsed.discordWebhookUrl = readValue(args, index, arg)
        index += 1
        break
      case "--slack-webhook-url":
        parsed.slackWebhookUrl = readValue(args, index, arg)
        index += 1
        break
      case "--model":
        parsed.model = readValue(args, index, arg) as GatewayModelId
        index += 1
        break
      case "--prompt":
        parsed.prompt = readValue(args, index, arg)
        index += 1
        break
      case "--include-path":
        parsed.includePaths = [...(parsed.includePaths ?? []), readValue(args, index, arg)]
        index += 1
        break
      case "--exclude-path":
        parsed.excludePaths = [...(parsed.excludePaths ?? []), readValue(args, index, arg)]
        index += 1
        break
      case "--help":
        printRetryHelp()
        throw new Error("__HELP__")
      default:
        throw new Error(`Unknown option ${arg}`)
    }
  }

  if (parsed.version && parsed.tag) {
    throw new Error("Use either --version or --tag, not both")
  }

  if (!parsed.branchName.trim()) {
    throw new Error("Missing required --branch")
  }

  return parsed
}

async function main() {
  const [command, ...args] = process.argv.slice(2)

  if (command !== "retry") {
    console.error("Usage: ai-changelog retry [options]")
    process.exitCode = 1
    return
  }

  try {
    const options = parseRetryArgs(args)
    await retryReleaseAnnouncement({
      options,
      logger: console,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "__HELP__") return
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main()
}
