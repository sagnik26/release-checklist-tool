import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("dist/graphql", { recursive: true });
copyFileSync("src/graphql/schema.graphql", "dist/graphql/schema.graphql");
