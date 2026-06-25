# @dimension-studios/ai-changelog

[![npm version](https://img.shields.io/npm/v/%40dimension-studios%2Fai-changelog?style=flat-square)](https://www.npmjs.com/package/@dimension-studios/ai-changelog) [![CI](https://github.com/dimension-studios-inc/ai-changelog/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/dimension-studios-inc/ai-changelog/actions/workflows/ci.yml) [![Release](https://github.com/dimension-studios-inc/ai-changelog/actions/workflows/release.yml/badge.svg)](https://github.com/dimension-studios-inc/ai-changelog/actions/workflows/release.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](./LICENSE)

AI-written release announcements for semantic-release. Generate one concise changelog message from the release diff, then publish it to Discord, Slack, or both.

## Contents

- [Install](#install)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Publishers](#publishers)
- [Retry Notifications](#retry-notifications)
- [CI and Testing](#ci-and-testing)
- [License](#license)

## Install

```sh
npm install --save-dev @dimension-studios/ai-changelog
```

## Quick Start

Add the plugin after semantic-release has generated release notes:

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

Set the required CI secrets:

```sh
AI_GATEWAY_API_KEY=...
AI_CHANGELOG_DISCORD_WEBHOOK=https://discord.com/api/webhooks/...
AI_CHANGELOG_SLACK_WEBHOOK=https://hooks.slack.com/services/...
```

At least one publisher webhook is required unless `dryRun` is enabled.

## Configuration

```js
export default {
  plugins: [
    [
      "@dimension-studios/ai-changelog",
      {
        branches: ["main", "beta"],
        model: "openai/gpt-5.4-nano",
        prompt: "Write concise release notes for non-developer readers.",
        discordWebhookUrl: process.env.AI_CHANGELOG_DISCORD_WEBHOOK,
        slackWebhookUrl: process.env.AI_CHANGELOG_SLACK_WEBHOOK,
        includePaths: ["src/", "packages/"],
        excludePaths: ["packages/generated/"],
        dryRun: false,
      },
    ],
  ],
}
```

### Required Options

At least one publisher webhook is required unless `dryRun` is enabled.

| Option | Default | Description |
| --- | --- | --- |
| `discordWebhookUrl` | `AI_CHANGELOG_DISCORD_WEBHOOK` | Discord webhook URL. |
| `slackWebhookUrl` | `AI_CHANGELOG_SLACK_WEBHOOK` | Slack incoming webhook URL. |
| `gatewayApiKey` | `AI_GATEWAY_API_KEY` | Vercel AI Gateway API key. |

### Optional Options

| Option | Default | Description |
| --- | --- | --- |
| `model` | `openai/gpt-5.4-nano` | AI SDK Gateway model ID. |
| `prompt` | built-in release announcement prompt | System prompt used to generate the announcement title and description. |
| `branches` | `["main", "main-release"]` | Branches allowed to publish announcements. |
| `includePaths` | all paths | Git path prefixes to include. |
| `excludePaths` | common generated/build files | Extra git paths to exclude. |
| `dryRun` | `false` | Generate and log payloads without posting. |

## Publishers

### Discord

Discord messages are sent as embeds with the generated title and description.

```js
[
  "@dimension-studios/ai-changelog",
  {
    discordWebhookUrl: process.env.AI_CHANGELOG_DISCORD_WEBHOOK,
  },
]
```

### Slack

Slack messages use Block Kit:

- `header` block for the generated title
- Markdown `section` block for the generated description
- `context` block with version and branch metadata
- top-level `text` fallback for notifications and accessibility

```js
[
  "@dimension-studios/ai-changelog",
  {
    slackWebhookUrl: process.env.AI_CHANGELOG_SLACK_WEBHOOK,
  },
]
```

Create a Slack incoming webhook from your Slack app settings, then store the generated URL as `AI_CHANGELOG_SLACK_WEBHOOK`.

### Discord and Slack

```js
[
  "@dimension-studios/ai-changelog",
  {
    discordWebhookUrl: process.env.AI_CHANGELOG_DISCORD_WEBHOOK,
    slackWebhookUrl: process.env.AI_CHANGELOG_SLACK_WEBHOOK,
  },
]
```

## Retry Notifications

If semantic-release succeeds but AI generation or webhook delivery fails, retry the notification without rerunning the
release:

```sh
npx ai-changelog retry --branch beta
```

By default, the retry command uses the latest reachable git tag, regenerates the AI announcement from the previous tag to
that release tag, and posts to every configured publisher. Use `--version` for a specific release:

```sh
npx ai-changelog retry --version 1.0.0-beta.2 --branch beta
```

Retry only one publisher when the other message was already posted:

```sh
npx ai-changelog retry --version 1.0.0-beta.2 --branch beta --publisher slack
npx ai-changelog retry --version 1.0.0-beta.2 --branch beta --publisher discord
```

Use `--dry-run` to verify the generated payloads without posting:

```sh
npx ai-changelog retry --version 1.0.0-beta.2 --branch beta --dry-run
```

The retry command reads the same environment variables as the semantic-release plugin:

```sh
AI_GATEWAY_API_KEY=...
AI_CHANGELOG_DISCORD_WEBHOOK=https://discord.com/api/webhooks/...
AI_CHANGELOG_SLACK_WEBHOOK=https://hooks.slack.com/services/...
```

You can also override those values for a single local run with `--gateway-api-key`, `--discord-webhook-url`, and
`--slack-webhook-url`.

### GitHub Actions Retry

To make retries available from the GitHub Actions UI, add a manual workflow in your repository that checks out full git
history, installs dependencies, builds the package, and runs `ai-changelog retry`. Expose only the retry-specific inputs
operators need:

- `version`: leave blank to retry the latest tag, or enter a version such as `1.0.0-beta.2`.
- `branch`: the branch name shown in Slack/Discord metadata, for example `beta` or `main`.
- `publisher`: `both`, `slack`, or `discord`.
- `dry_run`: preview payloads without sending webhook requests.

Use the same `AI_GATEWAY_API_KEY`, `AI_CHANGELOG_DISCORD_WEBHOOK`, and `AI_CHANGELOG_SLACK_WEBHOOK` secrets as your
release workflow so retries use the same model and webhook configuration.

For a complete example, see this repository's
[`retry-changelog.yml`](./.github/workflows/retry-changelog.yml) workflow.

## CI and Testing

Use `dryRun: true` when validating the plugin in CI. The plugin still collects release context and generates notification payloads, but it does not call any webhooks.

```js
[
  "@dimension-studios/ai-changelog",
  {
    dryRun: true,
  },
]
```

This package is verified with:

```sh
npm run lint
npm run type-check
npm test
npm run build
```

## License

MIT
