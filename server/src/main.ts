import { createServer, type Server } from "node:http";
import { pathToFileURL } from "node:url";
import { appModule } from "./app.module.js";
import { yoga } from "./graphql/yoga.js";

export function start(): Server {
  const port = Number(process.env.PORT ?? 4000);
  const server = createServer(yoga);
  server.listen(port, "0.0.0.0", () => {
    console.log(`GraphQL API listening on http://localhost:${port}/graphql`);
  });

  async function shutdown() {
    server.close();
    await appModule.databaseService.close();
    process.exit(0);
  }

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });

  return server;
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  start();
}
