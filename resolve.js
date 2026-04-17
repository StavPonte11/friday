const fs = require('fs');

const files = [
    'package.json',
    'packages/db/schema.prisma',
    'app/[locale]/(module-pm)/pm/layout.tsx',
    'lib/ai/pm-agent.ts',
    'lib/trpc/init.ts',
    'app/api/trpc/[trpc]/route.ts',
    'lib/trpc/server.ts',
    'app/api/mcp/route.ts',
    'lib/prisma.ts',
    'lib/trpc/routers/pm-analytics.ts',
    'lib/trpc/routers/pm-comments.ts',
    'lib/trpc/routers/pm-issues.ts',
    'lib/trpc/routers/pm-projects.ts',
    'lib/trpc/routers/pm-search.ts',
    'workers/github/sync.worker.ts',
    'workers/jira/sync.worker.ts'
];

for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let text = fs.readFileSync(file, 'utf8');
    
    // Custom handling based on file
    if (file === 'package.json') {
        text = text.replace(/<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>>[^\r\n]+/g, '$1\n$2');
    } else if (file === 'packages/db/schema.prisma') {
        text = text.replace(/<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>>[^\r\n]+/g, '$1\n$2');
    } else if (file === 'app/[locale]/(module-pm)/pm/layout.tsx') {
        text = text.replace(/<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>>[^\r\n]+/g, '$1\n$2');
    } else if (file === 'app/api/mcp/route.ts') {
        // use theirs since ours didn't have much MCP implementations
        text = text.replace(/<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>>[^\r\n]+/g, '$2');
    } else if (file === 'lib/trpc/server.ts') {
        text = text.replace(/<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>>[^\r\n]+/g, '$1\n$2');
    } else if (file === 'lib/prisma.ts') {
        text = text.replace(/<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>>[^\r\n]+/g, '$1');
    } else if (file === 'lib/trpc/init.ts') {
        // Keep rate limiter (theirs) AND auth bypass (ours). Keep both
        text = text.replace(/<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>>[^\r\n]+/g, '$1\n$2');
    } else {
        // Default: just keep both parts consecutively. Most of the time it is either add/add or safe to combine
        text = text.replace(/<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>>[^\r\n]+/g, '$1\n$2');
    }
    
    fs.writeFileSync(file, text);
    console.log(`Resolved: ${file}`);
}
