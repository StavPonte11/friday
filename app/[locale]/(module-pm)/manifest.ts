import { ModuleManifest } from '@packages/module-sdk/types';

export const manifest: ModuleManifest = {
    id: 'pm',
    name: 'Friday PM',
    description: 'Project Management, Issue Tracking, and Sprints',
    icon: 'Kanban',
    version: '1.0.0',
    minPortalVersion: '0.1.0',
    routes: [
        { path: '/pm/projects', label: 'Projects', icon: 'FolderKanban', showInNav: true },
        { path: '/pm/issues', label: 'Issues', icon: 'ListOrdered', showInNav: true },
        { path: '/pm/board', label: 'Board', icon: 'LayoutDashboard', showInNav: true },
        { path: '/pm/analytics', label: 'Analytics', icon: 'BarChart4', showInNav: false },
    ],
    permissions: ['pm:read', 'pm:write', 'pm:admin'],
    dbNamespace: 'Pm',
    queueNamespace: 'friday.pm.',
    mcpTools: ['pm_create_issue', 'pm_list_issues', 'pm_update_status'],
};
