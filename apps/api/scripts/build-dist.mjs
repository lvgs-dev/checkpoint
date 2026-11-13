// Finishes the API build after tsc: marks dist as ESM, adds the entry files and copies the
// runtime assets next to the compiled sources (dist/apps/api mirrors apps/api).
import { cp, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const api = fileURLToPath(new URL("..", import.meta.url));
const dist = `${api}dist/`;
const compiled = `${dist}apps/api/`;

await mkdir(compiled, { recursive: true });
await writeFile(`${dist}package.json`, '{"type":"module"}\n');
await writeFile(`${dist}index.js`, "import './apps/api/src/main/index.js';\n");
await writeFile(`${dist}migrate.js`, "export { migrate } from './apps/api/src/data/migrate.js';\n");
for (const asset of ["openapi.json", "package.json", "db/migrations"])
  await cp(`${api}${asset}`, `${compiled}${asset}`, { recursive: true });
