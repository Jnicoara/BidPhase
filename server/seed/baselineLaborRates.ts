/**
 * Baseline labor rates — the starter roles shipped with the app.
 *
 * These become rows in `labor_rates` with `userId = NULL`: owned by nobody,
 * read-only, and forked the moment a user edits one. Same ownership model as
 * BASELINE_MATERIALS.
 *
 * ── These numbers are placeholders, not market data ──────────────────────────
 * They are round, plausible US figures meant to get a new user to a working bid
 * on day one. They are not survey data, not regional, and not current. Every
 * screen that shows them says so, and every one is editable. Do not present
 * them anywhere as researched rates.
 *
 * Roles are free text on purpose — a contractor's org chart is their own.
 */
import type { LaborRateType } from "../../drizzle/schema";

export type BaselineLaborRate = {
  name: string;
  rateType: LaborRateType;
  /** Decimal columns — strings so no float rounding happens on the way in. */
  hourlyCost: string;
  /** Salary roles only; NULL on hourly roles. */
  annualSalary: string | null;
  annualHours: string | null;
};

export const BASELINE_LABOR_RATES: BaselineLaborRate[] = [
  { name: "Apprentice", rateType: "hourly", hourlyCost: "22.0000", annualSalary: null, annualHours: null },
  { name: "Journeyman", rateType: "hourly", hourlyCost: "38.0000", annualSalary: null, annualHours: null },
  { name: "Foreman/Master Electrician", rateType: "hourly", hourlyCost: "48.0000", annualSalary: null, annualHours: null },
  { name: "Supervisor", rateType: "hourly", hourlyCost: "55.0000", annualSalary: null, annualHours: null },

  // The one salaried starter, present so the salary path is exercised out of the
  // box. hourlyCost stays 0: for a salary role the rate is DERIVED from the two
  // fields below and never read from this column.
  {
    name: "Project Manager",
    rateType: "salary",
    hourlyCost: "0.0000",
    annualSalary: "60000.00",
    annualHours: "2080.00",
  },
];
