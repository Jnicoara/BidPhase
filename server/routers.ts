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
import { laborRatesRouter } from "./routers/laborRatesRouter";
import { modifiersRouter } from "./routers/modifiersRouter";
import { assembliesRouter } from "./routers/assembliesRouter";
import { bidsRouter } from "./routers/bidsRouter";
import { bidPdfsRouter } from "./routers/bidPdfsRouter";
import { takeoffRunsRouter } from "./routers/takeoffRunsRouter";
import { takeoffStampsRouter } from "./routers/takeoffStampsRouter";
import { kitsRouter } from "./routers/kitsRouter";

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
  laborRates: laborRatesRouter,
  modifiers: modifiersRouter,
  assemblies: assembliesRouter,
  bids: bidsRouter,
  bidPdfs: bidPdfsRouter,
  takeoffRuns: takeoffRunsRouter,
  takeoffStamps: takeoffStampsRouter,
  kits: kitsRouter,
});

export type AppRouter = typeof appRouter;
