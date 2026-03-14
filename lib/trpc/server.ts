import { router, publicProcedure } from './init';
import { tracesRouter } from './routers/traces';
import { pmProjectsRouter } from './routers/pm-projects';
import { pmIssuesRouter } from './routers/pm-issues';
import { pmSprintsRouter } from './routers/pm-sprints';
import { pmAnalyticsRouter } from './routers/pm-analytics';
import { workspacesRouter } from './routers/workspaces';

// Base app router
export const appRouter = router({
    healthcheck: publicProcedure.query(() => 'yay!'),
    traces: tracesRouter,
    workspaces: workspacesRouter,
    pmProjects: pmProjectsRouter,
    pmIssues: pmIssuesRouter,
    pmSprints: pmSprintsRouter,
    pmAnalytics: pmAnalyticsRouter,
});

export type AppRouter = typeof appRouter;
