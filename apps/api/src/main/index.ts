// Server entry (compiled to dist/index.js). It starts unconditionally and has no top-level await.
import { startServer } from "./start.ts";

startServer().catch(() => {
  console.error("API startup failed");
  process.exit(1);
});
