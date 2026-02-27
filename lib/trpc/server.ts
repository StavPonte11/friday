import { router, publicProcedure } from './init';
import { tracesRouter } from './routers/traces';
import { pmProjectsRouter } from './routers/pm-projects';
import { pmIssuesRouter } from './routers/pm-issues';
import { pmAnalyticsRouter } from './routers/pm-analytics';

// Base app router
export const appRouter = router({
    healthcheck: publicProcedure.query(() => 'yay!'),
    traces: tracesRouter,
    pmProjects: pmProjectsRouter,
    pmIssues: pmIssuesRouter,
    pmAnalytics: pmAnalyticsRouter,
});

export type AppRouter = typeof appRouter;
