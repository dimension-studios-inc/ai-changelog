export default {
  branches: ["main-release"],
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
        assets: ["CHANGELOG.md", "package.json", "pnpm-lock.yaml"],
        // biome-ignore lint/suspicious/noTemplateCurlyInString: semantic-release expands these placeholders at runtime.
        message: "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
      },
    ],
    [
      "./dist/index.mjs",
      {
        branches: ["main-release"],
        model: "openai/gpt-5.4-nano",
      },
    ],
  ],
}
