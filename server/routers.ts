import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { authRouter } from "./routers/authRouter";
import { projectsRouter } from "./routers/projectsRouter";
import { dataRouter } from "./routers/dataRouter";
import { masterItemsRouter } from "./routers/masterItemsRouter";
import { masterAssembliesRouter } from "./routers/masterAssembliesRouter";
import { masterLaborRatesRouter } from "./routers/masterLaborRatesRouter";
import { projectAssembliesRouter } from "./routers/projectAssembliesRouter";
import { projectItemsRouter } from "./routers/projectItemsRouter";
import { bidSummaryRouter } from "./routers/bidSummaryRouter";
import { featureFlagsRouter } from "./routers/featureFlagsRouter";
import { materialsRouter } from "./routers/materialsRouter";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  projects: projectsRouter,
  data: dataRouter,
  masterItems: masterItemsRouter,
  masterAssemblies: masterAssembliesRouter,
  masterLaborRates: masterLaborRatesRouter,
  projectAssemblies: projectAssembliesRouter,
  projectItems: projectItemsRouter,
  bidSummary: bidSummaryRouter,
  featureFlags: featureFlagsRouter,
  materials: materialsRouter,
});

export type AppRouter = typeof appRouter;
