import { defineConfig } from "tsdown"

export default defineConfig({
  deps: {
    skipNodeModulesBundle: true,
  },
  entry: ["./src/index.ts", "./src/cli.ts"],
  format: "esm",
  unbundle: true,
  sourcemap: true,
  dts: true,
  clean: true,
})
