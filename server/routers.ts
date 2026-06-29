import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { authRouter } from "./routers/authRouter";
import { projectsRouter } from "./routers/projectsRouter";
import { dataRouter } from "./routers/dataRouter";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  projects: projectsRouter,
  data: dataRouter,
});

export type AppRouter = typeof appRouter;
