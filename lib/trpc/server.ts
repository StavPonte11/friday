import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { tracesRouter } from './routers/traces';
import { pmProjectsRouter } from './routers/pm-projects';
import { pmIssuesRouter } from './routers/pm-issues';
import { pmAnalyticsRouter } from './routers/pm-analytics';

export const t = initTRPC.create({
    transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Base app router
export const appRouter = router({
    healthcheck: publicProcedure.query(() => 'yay!'),
    traces: tracesRouter,
    pmProjects: pmProjectsRouter,
    pmIssues: pmIssuesRouter,
    pmAnalytics: pmAnalyticsRouter,
});

export type AppRouter = typeof appRouter;
