import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";

const url = process.env.DATABASE_URL;
if (!url) { console.error("No DATABASE_URL"); process.exit(1); }

const db = drizzle(url);
try {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migration complete");
} catch (e) {
  console.error("Migration error:", e.message);
  if (e.sqlMessage) console.error("SQL error:", e.sqlMessage);
  if (e.sql) console.error("SQL:", e.sql);
  process.exit(1);
}
process.exit(0);
