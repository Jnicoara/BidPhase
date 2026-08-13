import mysql from "mysql2/promise";

const pool = mysql.createPool(process.env.DATABASE_URL);
try {
  const [rows] = await pool.execute("DESCRIBE bid_summary");
  console.log("bid_summary columns:", rows.map(r => r.Field).join(", "));

  const [migrations] = await pool.execute(
    "SELECT * FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 5"
  );
  console.log("Recent migrations:", migrations.map(m => m.hash).join(", "));
} catch (e) {
  console.error("Error:", e.message);
}
await pool.end();
