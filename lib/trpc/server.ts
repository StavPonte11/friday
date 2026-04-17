import { router, publicProcedure } from './init';
import { tracesRouter } from './routers/traces';
import { pmProjectsRouter } from './routers/pm-projects';
import { pmIssuesRouter } from './routers/pm-issues';
import { pmAnalyticsRouter } from './routers/pm-analytics';
import { workspacesRouter } from './routers/workspaces';
import { pmFeedbackRouter } from './routers/pm-feedback';
import { pmPresenceRouter } from './routers/pm-presence';
import { pmCommentsRouter } from './routers/pm-comments';
import { pmMentionsRouter } from './routers/pm-mentions';
import { pmOnboardingRouter } from './routers/pm-onboarding';
import { pmGraphRouter } from './routers/pm-graph';
import { pmAgentRouter } from './routers/pm-agent';
import { pmSearchRouter } from './routers/pm-search';
import { pmInsightsRouter } from './routers/pm-insights';
import { activityFeedRouter } from './routers/activity-feed';

// Base app router
export const appRouter = router({
    healthcheck: publicProcedure.query(() => 'yay!'),
    traces: tracesRouter,
    workspaces: workspacesRouter,
    pmProjects: pmProjectsRouter,
    pmIssues: pmIssuesRouter,
    pmAnalytics: pmAnalyticsRouter,
    pmFeedback: pmFeedbackRouter,
    pmPresence: pmPresenceRouter,
    pmComments: pmCommentsRouter,
    pmMentions: pmMentionsRouter,
    pmOnboarding: pmOnboardingRouter,
    pmGraph: pmGraphRouter,
    pmAgent: pmAgentRouter,
    pmSearch: pmSearchRouter,
    pmInsights: pmInsightsRouter,
    activityFeed: activityFeedRouter,
});

export type AppRouter = typeof appRouter;
