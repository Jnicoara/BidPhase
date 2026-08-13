/**
 * Baseline labor rates — the starter roles shipped with the app.
 *
 * These become rows in `labor_rates` with `userId = NULL`: owned by nobody,
 * read-only, and forked the moment a user edits one. Same ownership model as
 * BASELINE_MATERIALS.
 *
 * ── Every starter role ships at $0, and that is the point ────────────────────
 * These used to carry round, plausible US figures. Plausible was the problem: a
 * number that looks researched is indistinguishable on screen from one the
 * contractor set, so a bid could be built and sent on a rate nobody chose.
 *
 * That risk is far sharper here than it is for materials. An unpriced material
 * understates one line; the labor rate multiplies EVERY line in the bid at
 * once, so a single wrong rate is wrong by the whole labor cost of the job.
 * Zero cannot be mistaken for a considered rate, the screens flag it, and the
 * first-run flow asks for a real one before a new user reaches their first bid.
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

/** The rate every starter role ships at. See the file header. */
export const UNRATED = "0.0000";

export const BASELINE_LABOR_RATES: BaselineLaborRate[] = [
  {
    name: "Apprentice",
    rateType: "hourly",
    hourlyCost: UNRATED,
    annualSalary: null,
    annualHours: null,
  },
  {
    name: "Journeyman",
    rateType: "hourly",
    hourlyCost: UNRATED,
    annualSalary: null,
    annualHours: null,
  },
  {
    name: "Foreman/Master Electrician",
    rateType: "hourly",
    hourlyCost: UNRATED,
    annualSalary: null,
    annualHours: null,
  },
  {
    name: "Supervisor",
    rateType: "hourly",
    hourlyCost: UNRATED,
    annualSalary: null,
    annualHours: null,
  },

  // The one salaried starter, present so the salary path is exercised out of
  // the box. hourlyCost stays 0 because for a salary role the rate is DERIVED
  // and never read from that column.
  //
  // annualHours stays at a real 2,080 while the salary is what ships at zero.
  // That is not cosmetic: effectiveHourlyRate treats zero hours as a division
  // by zero and throws rather than returning "free", so zeroing the hours
  // instead would take out every screen that prices a salaried role.
  {
    name: "Project Manager",
    rateType: "salary",
    hourlyCost: UNRATED,
    annualSalary: "0.00",
    annualHours: "2080.00",
  },
];
