// Liveness for the container healthcheck. It touches no auth, rate limit or database.
import type { IncomingMessage, ServerResponse } from "node:http";
import { ContentType } from "./http.ts";

const HEALTH_PATH = "/api/health";

/** Answers GET /api/health and returns true. Returns false for any other request. */
export function healthRoute(req: IncomingMessage, res: ServerResponse): boolean {
  if (req.method !== "GET" || (req.url ?? "").split("?")[0] !== HEALTH_PATH) return false;
  res.writeHead(200, { "Content-Type": ContentType.JsonUtf8, "Cache-Control": "no-store" });
  res.end(JSON.stringify({ status: "ok", revision: process.env.APP_REVISION || "unknown" }));
  return true;
}
