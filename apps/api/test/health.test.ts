import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { makeSmokeServer } from "../src/main/start.ts";
import { startTestServer, testFetch, type TestServerContext } from "./security/helper.ts";

describe("GET /api/health", () => {
  let ctx: TestServerContext;
  beforeAll(async () => {
    ctx = await startTestServer();
  });
  afterAll(() => ctx.close());

  it("answers 200 with the revision before auth and database access", async () => {
    process.env.APP_REVISION = "abc123";
    const res = await testFetch(ctx.baseUrl, "/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", revision: "abc123" });
  });

  it("reports unknown without APP_REVISION", async () => {
    delete process.env.APP_REVISION;
    const res = await testFetch(ctx.baseUrl, "/api/health");
    expect(await res.json()).toEqual({ status: "ok", revision: "unknown" });
  });
});

describe("smoke mode server", () => {
  let server: Server;
  let base: string;
  beforeAll(async () => {
    server = makeSmokeServer();
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => void server.close());

  it("serves health without PostgreSQL or secrets", async () => {
    const res = await fetch(`${base}/api/health`);
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("ok");
  });

  it("answers 503 on other routes", async () => {
    expect((await fetch(`${base}/api/v1/games`)).status).toBe(503);
  });
});
