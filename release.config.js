export default {
  branches: ["main"],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    [
      "@semantic-release/npm",
      {
        npmPublish: true,
      },
    ],
    [
      "@semantic-release/github",
      {
        labels: false,
      },
    ],
    [
      "@semantic-release/git",
      {
        assets: ["CHANGELOG.md", "package.json", "bun.lock"],
        // oxlint-disable-next-line eslint/no-template-curly-in-string -- semantic-release expands these placeholders at runtime.
        message: "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
      },
    ],
    [
      "./dist/index.mjs",
      {
        branches: ["main"],
        model: "openai/gpt-5.4-nano",
      },
    ],
  ],
}
