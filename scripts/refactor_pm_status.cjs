const fs = require('fs');
const path = require('path');
const filesToUpdate = [
    "workers/jira/sync.worker.ts",
    "scripts/generate-test-data.ts",
    "scripts/seed-friday-pm.ts",
    "tests/integration/api/pm-issues.test.ts",
    "manual_test_pm_issues.ts",
    "lib/ai/pm-agent.ts",
    "lib/trpc/routers/pm-sprints.ts",
    "lib/trpc/routers/pm-issues.ts",
    "app/[locale]/(module-pm)/pm/board/page.tsx",
    "app/[locale]/(module-pm)/pm/issues/page.tsx",
    "components/issues/CreateIssueModal.tsx"
];

for (const relPath of filesToUpdate) {
    const fullPath = path.join("c:/Users/User/OneDrive/שולחן העבודה/Stav/Agents/friday", relPath);
    if (!fs.existsSync(fullPath)) continue;
    let content = fs.readFileSync(fullPath, 'utf8');
    
    content = content.replace(/PmIssueStatus\.([A-Z_]+)/g, '"$1"');
    content = content.replace(/z\.nativeEnum\(PmIssueStatus\)/g, 'z.string()');
    content = content.replace(/,\s*PmIssueStatus/g, '');
    content = content.replace(/PmIssueStatus\s*,/g, '');
    content = content.replace(/import\s*{\s*PmIssueStatus\s*}\s*from\s*"@prisma\/client";?/g, '');
    content = content.replace(/:\s*PmIssueStatus(\[\])?/g, (match, p1) => p1 ? ': string[]' : ': string');
    content = content.replace(/as unknown as string/g, 'as string');

    fs.writeFileSync(fullPath, content, 'utf8');
}
console.log("Done refactoring PmIssueStatus");
