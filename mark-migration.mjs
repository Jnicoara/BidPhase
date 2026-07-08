import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { createHash } from "crypto";

const pool = mysql.createPool(process.env.DATABASE_URL);

// Read the migration file
const sql = readFileSync("./drizzle/0004_blue_meteorite.sql", "utf-8");
const hash = createHash("sha256").update(sql).digest("hex");

try {
  // Check if already recorded
  const [existing] = await pool.execute(
    "SELECT hash FROM __drizzle_migrations WHERE hash = ?",
    [hash]
  );
  
  if (existing.length > 0) {
    console.log("Migration 0004 already recorded in __drizzle_migrations");
  } else {
    // Insert the migration record
    await pool.execute(
      "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
      [hash, Date.now()]
    );
    console.log("Marked migration 0004 as applied:", hash);
  }
} catch (e) {
  console.error("Error:", e.message);
}

await pool.end();
