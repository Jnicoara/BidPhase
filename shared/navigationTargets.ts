/**
 * Everywhere the navigation helper is allowed to send someone.
 *
 * ── A closed list, enforced on the server ────────────────────────────────────
 * The helper is an LLM, and the thing an LLM will eventually do is name a
 * destination that does not exist — a plausible route, confidently wrong. So it
 * does not get to return a URL. It picks an ID out of this list, and the server
 * looks that ID up here before anything reaches the client; anything unknown is
 * dropped and the answer degrades to plain text.
 *
 * That is the whole security model and it is deliberately boring: the model
 * chooses BETWEEN fixed options, it never constructs one. Adding a destination
 * is adding an entry here — and only here, so there is one list to audit rather
 * than a prompt and a validator that can disagree.
 *
 * `path` values are the app's real hash routes (see pathToRoute in
 * HelixBidShell). Keep them in step; a stale path here is a dead end that looks
 * like a working answer.
 */

export type NavigationTarget = {
  id: string;
  /** What the user sees offered to them. */
  label: string;
  /** The real hash route. */
  path: string;
  /**
   * What this screen is for, in the words a user would use.
   *
   * This text is what the model actually matches against, so it is written for
   * recall rather than accuracy — it names the tasks people ask about, not the
   * features the screen has.
   */
  purpose: string;
};

export const NAVIGATION_TARGETS: NavigationTarget[] = [
  {
    id: "labor-rates",
    label: "Labor Rates",
    path: "#/library/labor-rates",
    purpose:
      "Set or edit hourly and salaried labor rates for roles like apprentice, journeyman, foreman. Change what an hour costs. Crew pay rates.",
  },
  {
    id: "materials",
    label: "Materials",
    path: "#/library/materials",
    purpose:
      "The material catalog assemblies are built from. Price materials, add a material, edit costs, set trade slang, find items that still need a price.",
  },
  {
    id: "assemblies",
    label: "Assemblies",
    path: "#/library/assemblies",
    purpose:
      "Reusable recipes — a receptacle, a switch, a light — combining materials and labor hours. Build, edit or price an assembly.",
  },
  {
    id: "kits",
    label: "Kits",
    path: "#/library/kits",
    purpose:
      "Groups of assemblies bundled together to drop onto a bid in one go.",
  },
  {
    id: "modifiers",
    label: "Modifiers",
    path: "#/library/modifiers",
    purpose:
      "Percentage adjustments to labor for conditions like working at height, overtime, or difficult access.",
  },
  {
    id: "quick-bid",
    label: "Quick bid",
    path: "#/quickbid",
    purpose:
      "Build a bid fast by adding assemblies and quantities. The quickest way to price a job or start a new estimate.",
  },
  {
    id: "bids",
    label: "Bids",
    path: "#/bids",
    purpose:
      "All your bids and estimates. Open an existing bid, check its status, see what you have quoted.",
  },
  {
    id: "bid-archive",
    label: "Bid archive",
    path: "#/archive",
    purpose:
      "Archived bids, and where to restore one that was removed by mistake before it is permanently deleted.",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    path: "#/dashboard",
    purpose:
      "The overview of recent bids and where things stand. The home screen.",
  },
  {
    /**
     * Listed for everybody, even though only owners and admins may open it.
     *
     * The helper has no company scope to filter on — it is `protectedProcedure`
     * and reads nothing, which is what keeps it cheap and unprivileged. Sending
     * an estimator here costs them one click and a sentence explaining that the
     * company's overall figures are the owner's to share; leaving it out would
     * cost the owner — the person this screen is FOR — the only question the
     * helper is likely to be asked about it.
     */
    id: "analytics",
    label: "Performance",
    path: "#/analytics",
    purpose:
      "How the business is doing. Win rate, how many bids were won or lost, hit rate over time, whether jobs are making the margin they were quoted at, profitability by trade, which jobs ran over.",
  },
  {
    id: "material-database",
    label: "Material Database",
    path: "#/matdb",
    purpose:
      "The supply-house price list — imported or connected supplier pricing. Distinct from the material catalog used by assemblies.",
  },
  {
    id: "settings",
    label: "Settings",
    path: "#/settings",
    purpose:
      "Account and app settings, theme, display scale, company pricing defaults like overhead and profit.",
  },
];

const BY_ID = new Map(NAVIGATION_TARGETS.map(t => [t.id, t]));

/** Every id the helper may name. Used to build the tool's enum. */
export const NAVIGATION_TARGET_IDS = NAVIGATION_TARGETS.map(t => t.id);

/**
 * Resolve an id the model produced, or null if it invented one.
 *
 * The null case is the point of this function. It is expected traffic, not an
 * error: the caller turns it into a text-only answer, which is a worse answer
 * than a working link and a far better one than sending a lost user to a route
 * that does not exist.
 */
export function resolveNavigationTarget(
  id: string | null | undefined
): NavigationTarget | null {
  if (!id) return null;
  return BY_ID.get(id.trim()) ?? null;
}
