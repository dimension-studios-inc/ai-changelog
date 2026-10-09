export default {
  extends: ["@commitlint/config-conventional"],
  ignores: [(/** @type {string} */ message) => message.startsWith("Merge ")],
}
