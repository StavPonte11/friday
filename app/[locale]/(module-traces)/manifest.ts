import { ModuleManifest } from '@packages/module-sdk/types';

export const manifest: ModuleManifest = {
    id: 'traces',
    name: 'Friday Traces',
    description: 'AI observability, session traces, and prompt management',
    icon: 'Activity',
    version: '1.0.0',
    minPortalVersion: '0.1.0',
    routes: [
        { path: '/traces/sessions', label: 'Sessions', icon: 'ListTree', showInNav: true },
        { path: '/traces/prompts', label: 'Prompts', icon: 'FileCode2', showInNav: true },
        { path: '/traces/metrics', label: 'Metrics', icon: 'LineChart', showInNav: true },
    ],
    permissions: ['traces:read', 'traces:write', 'traces:admin'],
    dbNamespace: 'Traces',
    queueNamespace: 'friday.traces.',
    mcpTools: ['traces_get_sessions', 'traces_get_metrics'],
};
