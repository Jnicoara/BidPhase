/**
 * Print the curated category list with how many materials sit on each shelf.
 *
 * Categories are a curated, enforced field — a mysqlEnum the user picks from
 * and never adds to — so "is the list complete" is a question worth being able
 * to answer at a glance rather than by reading the seed modules.
 *
 *   pnpm tsx scripts/categoryAudit.mts
 */
import { MATERIAL_CATEGORIES } from "../drizzle/schema";
import { BASELINE_MATERIALS } from "../server/seed/baselineMaterials";

const counts = new Map<string, number>();
for (const m of BASELINE_MATERIALS) {
  counts.set(m.category, (counts.get(m.category) ?? 0) + 1);
}

console.log(`Curated categories (${MATERIAL_CATEGORIES.length}):\n`);
for (const category of MATERIAL_CATEGORIES) {
  console.log(
    `  ${String(counts.get(category) ?? 0).padStart(4)}  ${category}`
  );
}

const empty = MATERIAL_CATEGORIES.filter(c => !counts.get(c));
console.log(`\nEmpty shelves: ${empty.length ? empty.join(", ") : "none"}`);
console.log(`Total materials: ${BASELINE_MATERIALS.length}`);
