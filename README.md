# @dimension-studios/ai-changelog

Generate AI-written changelog announcements from semantic-release and publish them to Discord.

The plugin runs during the semantic-release `success` step. It reads the release range, summarizes the user-facing changes with AI, and sends a concise Discord embed.

## Install

```sh
npm install --save-dev @dimension-studios/ai-changelog
```

## Usage

Add the plugin after semantic-release has generated release notes.

```js
export default {
  branches: ["main"],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@dimension-studios/ai-changelog",
  ],
}
```

Set the required environment variables in CI:

```sh
AI_GATEWAY_API_KEY=...
AI_CHANGELOG_DISCORD_WEBHOOK=https://discord.com/api/webhooks/...
```

## Configuration

```js
export default {
  plugins: [
    [
      "@dimension-studios/ai-changelog",
      {
        branches: ["main", "main-release"],
        model: "openai/gpt-5.4-nano",
        includePaths: ["src/", "packages/"],
        excludePaths: ["packages/generated/"],
        dryRun: false,
      },
    ],
  ],
}
```

Options:

| Option | Default | Description |
| --- | --- | --- |
| `discordWebhookUrl` | `AI_CHANGELOG_DISCORD_WEBHOOK`, then `DISCORD_WEBHOOK` | Discord webhook URL. |
| `gatewayApiKey` | `AI_GATEWAY_API_KEY` | Vercel AI Gateway API key. |
| `model` | `openai/gpt-5.4-nano` | AI Gateway model string, such as `anthropic/claude-sonnet-4.5` or `xai/grok-3-beta`. |
| `branches` | `["main", "main-release"]` | Branches allowed to publish announcements. |
| `includePaths` | all paths | Optional git path prefixes to include. |
| `excludePaths` | common generated/build files | Extra git paths to exclude. |
| `dryRun` | `false` | Generate notes and log the Discord payload without posting. |

## CI Release

Use `dryRun: true` when testing the plugin in CI. The plugin still collects release context and generates the Discord payload, but it does not call the webhook.

## Dogfooding

This package can use itself during its own semantic-release run. Build the package first, then load the local built plugin from `./dist/index.mjs` in `release.config.js`.

```js
export default {
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    [
      "./dist/index.mjs",
      {
        branches: ["main"],
        model: "openai/gpt-5.4-nano",
      },
    ],
  ],
}
```

## License

MIT
