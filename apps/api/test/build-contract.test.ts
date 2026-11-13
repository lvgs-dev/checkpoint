// The compiled API is loaded with require(), so no module in its graph may use top-level await.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("API build contract", () => {
  it("declares a build script and a build tsconfig that rewrites .ts imports", () => {
    expect(JSON.parse(read("package.json")).scripts.build).toContain("tsconfig.build.json");
    const config = JSON.parse(read("tsconfig.build.json")).compilerOptions;
    expect(config.rewriteRelativeImportExtensions).toBe(true);
    expect(config.outDir).toBe("dist");
  });

  it.each(["src/main/server.ts", "src/main/start.ts", "src/data/migrate.ts"])(
    "%s has no top-level await",
    (path) => {
      expect(read(path)).not.toMatch(/^await /m);
    },
  );

  it("keeps the migration CLI and the server entry in their own files", () => {
    expect(read("src/data/migrate-cli.ts")).toContain("await migrate()");
    expect(read("src/main/index.ts")).toContain("startServer");
  });
});
