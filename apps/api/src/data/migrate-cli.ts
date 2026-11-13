// CLI: applies the pending migrations to DATABASE_URL (pnpm db:migrate).
import { migrate } from "./migrate.ts";

await migrate();
