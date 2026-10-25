import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const graphqlEntry = fileURLToPath(new URL("../node_modules/graphql/index.mjs", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      graphql: graphqlEntry,
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
  },
});
