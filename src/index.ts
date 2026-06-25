import { resolveConfig } from "./config"
import { sendReleaseNotesForRange } from "./release"
import type { PluginConfig, ReleaseNotesLogger } from "./shared/types"

export type { GatewayModelId } from "@ai-sdk/gateway"
// biome-ignore lint/performance/noBarrelFile: root package entrypoint intentionally defines the public API.
export { DEFAULT_EXCLUDE_PATHS, resolveConfig } from "./config"
export { sendReleaseNotesForRange } from "./release"
export { resolveRetryReleaseContext, retryReleaseAnnouncement } from "./retry"
export type { Announcement, PluginConfig, ReleaseNotesLogger, ResolvedConfig } from "./shared/types"

type SemanticReleaseSuccessContext = {
  nextRelease: {
    gitHead: string
    version: string
    notes?: string
  }
  lastRelease?: {
    gitHead?: string
  }
  branch: {
    name: string
  }
  logger: ReleaseNotesLogger
}

const EMPTY_TREE_GIT_HEAD = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"

export default {
  async success(pluginConfig: PluginConfig, context: SemanticReleaseSuccessContext) {
    const config = resolveConfig(pluginConfig)

    return await sendReleaseNotesForRange({
      from: context.lastRelease?.gitHead ?? EMPTY_TREE_GIT_HEAD,
      to: context.nextRelease.gitHead,
      version: context.nextRelease.version,
      releaseNotes: context.nextRelease.notes ?? "",
      branchName: context.branch.name,
      logger: context.logger,
      config,
    })
  },
}
