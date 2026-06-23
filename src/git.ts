import { execa } from "execa"

import type { ResolvedConfig } from "./shared/types"

export type GitRunner = (args: string[]) => Promise<string>

export type ReleaseContext = {
  diffStat: string
  commitList: string
  changedFiles: string[]
  patch: string
}

export const runGit: GitRunner = async (args) => {
  const { stdout } = await execa("git", args, { stdio: "pipe" })
  return (stdout ?? "").trim()
}

function excludeArgs(paths: string[]) {
  return paths.map((path) => `:(exclude)${path}`)
}

function pathArgs(paths: string[]) {
  return paths.length > 0 ? paths : ["."]
}

export function isIncludedPath(file: string, config: Pick<ResolvedConfig, "includePaths" | "excludePaths">) {
  if (config.includePaths.length > 0 && !config.includePaths.some((path) => file.startsWith(path))) {
    return false
  }

  return !config.excludePaths.some((path) => {
    if (path.includes("*")) return false
    return file === path || file.startsWith(path.replace(/\/$/, ""))
  })
}

export async function collectReleaseContext({
  from,
  to,
  config,
  git = runGit,
}: {
  from: string
  to: string
  config: ResolvedConfig
  git?: GitRunner
}): Promise<ReleaseContext> {
  const range = `${from}..${to}`
  const diffArgs = ["diff", range, "--", ...pathArgs(config.includePaths), ...excludeArgs(config.excludePaths)]

  const [diffStat, commitList, changedFilesOutput, patch] = await Promise.all([
    git(["diff", range, "--stat"]),
    git(["log", range, "--oneline", "--no-decorate"]),
    git(["diff", range, "--name-only", "--", ...pathArgs(config.includePaths), ...excludeArgs(config.excludePaths)]),
    git([...diffArgs, "--minimal"]),
  ])

  return {
    diffStat,
    commitList,
    changedFiles: changedFilesOutput
      .split("\n")
      .map((file) => file.trim())
      .filter(Boolean)
      .filter((file) => isIncludedPath(file, config)),
    patch,
  }
}
