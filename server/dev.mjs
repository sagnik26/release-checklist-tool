import { spawn, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const tscBin = fileURLToPath(new URL("../node_modules/typescript/bin/tsc", import.meta.url));

execSync(`node ${JSON.stringify(tscBin)} && node copy-schema.mjs`, { stdio: "inherit" });

const tsc = spawn(process.execPath, [tscBin, "--watch", "--preserveWatchOutput"], {
  stdio: "inherit",
});

const nodeArgs = ["--watch", "dist/main.js"];
if (existsSync(".env")) {
  nodeArgs.unshift("--env-file=.env");
}

const server = spawn(process.execPath, nodeArgs, { stdio: "inherit" });

function shutdown() {
  tsc.kill();
  server.kill();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
tsc.on("exit", (code) => {
  if (code) process.exit(code);
});
server.on("exit", (code) => {
  tsc.kill();
  process.exit(code ?? 0);
});
