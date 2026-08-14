import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { authRouter } from "./routers/authRouter";
import { projectsRouter } from "./routers/projectsRouter";
import { masterItemsRouter } from "./routers/masterItemsRouter";
import { masterAssembliesRouter } from "./routers/masterAssembliesRouter";
import { masterLaborRatesRouter } from "./routers/masterLaborRatesRouter";
import { projectAssembliesRouter } from "./routers/projectAssembliesRouter";
import { projectItemsRouter } from "./routers/projectItemsRouter";
import { bidSummaryRouter } from "./routers/bidSummaryRouter";
import { featureFlagsRouter } from "./routers/featureFlagsRouter";
import { materialsRouter } from "./routers/materialsRouter";
import { laborRatesRouter } from "./routers/laborRatesRouter";
import { modifiersRouter } from "./routers/modifiersRouter";
import { assembliesRouter } from "./routers/assembliesRouter";
import { bidsRouter } from "./routers/bidsRouter";
import { clientsRouter } from "./routers/clientsRouter";
import { salesTaxRouter } from "./routers/salesTaxRouter";
import { proposalsRouter } from "./routers/proposalsRouter";
import { bidPdfsRouter } from "./routers/bidPdfsRouter";
import { takeoffRunsRouter } from "./routers/takeoffRunsRouter";
import { takeoffStampsRouter } from "./routers/takeoffStampsRouter";
import { kitsRouter } from "./routers/kitsRouter";
import { onboardingRouter } from "./routers/onboardingRouter";
import { navigationRouter } from "./routers/navigationRouter";
import { planCopilotRouter } from "./routers/planCopilotRouter";
import { earlyAccessRouter } from "./routers/earlyAccessRouter";
import { backupRouter } from "./routers/backupRouter";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  projects: projectsRouter,
  masterItems: masterItemsRouter,
  masterAssemblies: masterAssembliesRouter,
  masterLaborRates: masterLaborRatesRouter,
  projectAssemblies: projectAssembliesRouter,
  projectItems: projectItemsRouter,
  bidSummary: bidSummaryRouter,
  featureFlags: featureFlagsRouter,
  materials: materialsRouter,
  laborRates: laborRatesRouter,
  modifiers: modifiersRouter,
  assemblies: assembliesRouter,
  bids: bidsRouter,
  // Who the work is for. A bid points at one optionally — see shared/bidClient.ts
  // for how a linked record and a bid's own typed-in name are reconciled.
  clients: clientsRouter,
  // Sales tax areas and the company rules that say what is taxable. Nothing
  // here is seeded — see shared/salesTax.ts for why a shipped rate table
  // would be worse than none.
  salesTax: salesTaxRouter,
  proposals: proposalsRouter,
  bidPdfs: bidPdfsRouter,
  takeoffRuns: takeoffRunsRouter,
  takeoffStamps: takeoffStampsRouter,
  kits: kitsRouter,
  onboarding: onboardingRouter,
  navigation: navigationRouter,
  // Separate from `navigation` on purpose — separate scope, separate action
  // list, separate model call. See the header of planCopilotRouter.
  planCopilot: planCopilotRouter,
  // The marketing landing page's waitlist. Carries the app's only public
  // write — see the router header for what guards it instead of auth.
  earlyAccess: earlyAccessRouter,
  // Admin-only. Exports everything to Cloudflare R2, independent of Manus —
  // scripts/backup.mts is the same job without needing the app to be up.
  backup: backupRouter,
});

export type AppRouter = typeof appRouter;
