import { router, publicProcedure } from './init';
import { tracesRouter } from './routers/traces';
import { pmProjectsRouter } from './routers/pm-projects';
import { pmIssuesRouter } from './routers/pm-issues';
import { pmSprintsRouter } from './routers/pm-sprints';
import { pmAnalyticsRouter } from './routers/pm-analytics';
import { workspacesRouter } from './routers/workspaces';
import { pmCommentsRouter } from './routers/pm-comments';
import { pmNotificationsRouter } from './routers/pm-notifications';
import { pmAttachmentsRouter } from './routers/pm-attachments';
import { pmWebhooksRouter } from './routers/pm-webhooks';
import { pmGitLabRouter } from './routers/pm-gitlab';
import { pmSavedViewsRouter } from './routers/pm-saved-views';
import { pmVersionsRouter } from './routers/pm-versions';
import { pmSearchRouter } from './routers/pm-search';
import { pmFavoritesRouter } from './routers/pm-favorites';
import { pmFeatureFlagsRouter } from './routers/pm-feature-flags';
import { pmAiRouter } from './routers/pm-ai';

// Base app router
export const appRouter = router({
    healthcheck: publicProcedure.query(() => 'yay!'),
    traces: tracesRouter,
    workspaces: workspacesRouter,
    pmProjects: pmProjectsRouter,
    pmIssues: pmIssuesRouter,
    pmSprints: pmSprintsRouter,
    pmAnalytics: pmAnalyticsRouter,
    pmComments: pmCommentsRouter,
    pmNotifications: pmNotificationsRouter,
    pmAttachments: pmAttachmentsRouter,
    pmWebhooks: pmWebhooksRouter,
    pmGitLab: pmGitLabRouter,
    pmSavedViews: pmSavedViewsRouter,
    pmVersions: pmVersionsRouter,
    pmSearch: pmSearchRouter,
    pmFavorites: pmFavoritesRouter,
    pmFeatureFlags: pmFeatureFlagsRouter,
    pmAi: pmAiRouter,
});

export type AppRouter = typeof appRouter;
