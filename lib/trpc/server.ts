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
import { pmTimelineRouter } from './routers/pm-timeline';
import { pmIntelligenceRouter } from './routers/pm-intelligence';
import { pmIntegrationRouter } from './routers/pm-integrations';
import { pmTimeTrackingRouter } from './routers/pm-time-tracking';
import { pmHierarchyRouter } from './routers/pm-hierarchy';
import { pmExecutiveRouter } from './routers/pm-executive';
import { adminUsersRouter } from './routers/admin-users';
import { adminGroupsRouter } from './routers/admin-groups';
import { boardAccessRouter } from './routers/board-access';
import { adminInvitesRouter } from './routers/admin-invites';
import { pmActivityRouter } from './routers/pm-activity';
// Integration epic routers
import { pmCalendarRouter } from './routers/pm-calendar';
import { pmGitRouter } from './routers/pm-git';
import { pmDesignRouter } from './routers/pm-design';
// Production epic routers
import { pmDependenciesRouter } from './routers/pm-dependencies';
import { pmBulkRouter } from './routers/pm-bulk';

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
    pmTimeline: pmTimelineRouter,
    pmIntelligence: pmIntelligenceRouter,
    pmIntegrations: pmIntegrationRouter,
    pmTimeTracking: pmTimeTrackingRouter,
    pmHierarchy: pmHierarchyRouter,
    pmExecutive: pmExecutiveRouter,
    pmActivity: pmActivityRouter,
    pmCalendar: pmCalendarRouter,
    pmGit: pmGitRouter,
    pmDesign: pmDesignRouter,
    pmDependencies: pmDependenciesRouter,
    pmBulk: pmBulkRouter,
    adminUsers: adminUsersRouter,
    adminGroups: adminGroupsRouter,
    boardAccess: boardAccessRouter,
    adminInvites: adminInvitesRouter,
});

export type AppRouter = typeof appRouter;
