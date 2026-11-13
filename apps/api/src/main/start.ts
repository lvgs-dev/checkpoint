// Starts the HTTP server from the environment. Callers must not rely on top-level await.
import { createServer, type Server } from "node:http";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "../data/migrate.ts";
import { assertNoAuthAllowed, authenticatorFromEnv } from "../auth/auth.ts";
import { SEED_APP_USER_ID } from "../services/auth-user.ts";
import { flushLogs, logger } from "../observability/logger.ts";
import { healthRoute } from "../routes/health.ts";
import { releaseStoreFromEnv } from "./data.ts";
import { makeServer } from "./server.ts";
import { createService } from "./setup.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));

/** Smoke mode: the health route only. Other routes answer 503. No database, no secrets. */
export function makeSmokeServer(): Server {
  return createServer((req, res) => {
    if (healthRoute(req, res)) return;
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end('{"status":"unavailable"}');
  });
}

export async function startServer(): Promise<void> {
  if (process.env.APP_SMOKE_TEST === "true") {
    makeSmokeServer().listen(Number(process.env.PORT) || 8000, process.env.HOST ?? "0.0.0.0");
    return;
  }
  if (process.env.DATABASE_URL) await migrate();
  const auth = authenticatorFromEnv();
  const host = process.env.HOST ?? "127.0.0.1";
  if (!auth) assertNoAuthAllowed(process.env, host);
  const { service, storage, wishlist, config, track } = await createService({
    dataDir: resolve(root, "data"),
    // Sem auth (dev), os dados do Postgres são os do dono do seed.
    devAppUserId: auth ? undefined : SEED_APP_USER_ID,
  });
  const server = makeServer(service, auth, wishlist, releaseStoreFromEnv(), config, track);
  if (!auth)
    logger.warn("server.no_auth", {
      note: "DATABASE_URL is unset: running without authentication on loopback only",
    });
  for (const signal of ["SIGTERM", "SIGINT"] as const)
    process.on(signal, () => void flushLogs().finally(() => process.exit(0)));
  server.listen(Number(process.env.PORT) || 3000, host, () =>
    logger.info("server.listening", { storage, host, port: Number(process.env.PORT) || 3000 }),
  );
}
