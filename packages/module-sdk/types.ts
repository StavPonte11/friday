export interface ModuleRoute {
    path: string;
    label: string;
    icon?: string;
    showInNav?: boolean;
}

export interface ModuleSetting {
    key: string;
    label: string;
    type: 'string' | 'boolean' | 'number' | 'json';
    defaultValue?: any;
}

export interface ModuleManifest {
    id: string;                    // e.g. "pm", "traces"
    name: string;                  // Display name: "Friday PM"
    description: string;
    icon: string;                  // Lucide icon name
    version: string;
    minPortalVersion: string;
    routes: ModuleRoute[];         // Nav items and their paths
    permissions: string[];         // e.g. ["pm:read", "pm:write", "pm:admin"]
    dbNamespace: string;           // Prisma model prefix, e.g. "Pm"
    queueNamespace: string;        // RabbitMQ queue prefix, e.g. "friday.pm."
    settings?: ModuleSetting[];    // Configurable settings shown in Modules Settings page
    mcpTools?: string[];           // Tool IDs this module exposes to the Agentic Platform
}
