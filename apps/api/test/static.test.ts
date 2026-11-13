import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { staticBase, staticRoute } from "../src/routes/static.ts";

// Container layout: cwd is /app and the web build sits in /app/public.
const app = mkdtempSync(join(tmpdir(), "app-"));
let previous: string;
beforeAll(() => {
  mkdirSync(join(app, "public", "assets"), { recursive: true });
  writeFileSync(join(app, "public", "index.html"), "<html>spa</html>");
  writeFileSync(join(app, "public", "assets", "app.js"), "console.log(1)");
  previous = process.cwd();
  process.chdir(app);
});
afterAll(() => {
  process.chdir(previous);
  rmSync(app, { recursive: true, force: true });
});

describe("static web in production", () => {
  it("defaults to ./public under the working directory", () => {
    expect(staticBase({ NODE_ENV: "production" }, "/app")).toBe("/app/public");
  });
  it("lets STATIC_DIR override the directory", () => {
    expect(staticBase({ NODE_ENV: "production", STATIC_DIR: "/srv/web" }, "/app")).toBe("/srv/web");
  });
  it("serves files and falls back to index.html for SPA paths", async () => {
    process.env.NODE_ENV = "production";
    try {
      const asset = await staticRoute("/assets/app.js");
      expect(asset && "raw" in asset && asset.raw.toString()).toBe("console.log(1)");
      const spa = await staticRoute("/jogos/42");
      expect(spa && "raw" in spa && spa.raw.toString()).toBe("<html>spa</html>");
      const escape = await staticRoute("/../../etc/passwd");
      expect(escape && "raw" in escape && escape.raw.toString()).toBe("<html>spa</html>");
    } finally {
      delete process.env.NODE_ENV;
    }
  });
});
