import { startCalendarSyncWorker } from "./calendar/sync.worker";
import { startJiraSyncWorker } from "./jira/sync.worker";
import { startGitHubSyncWorker } from "./github/sync.worker";
import { startEmailSyncWorker } from "./email/sync.worker";

/**
 * Main Worker Entry Point
 * 
 * To start all workers:
 *   npx tsx workers/index.ts
 * 
 * To start a specific worker:
 *   WORKER_TYPE=calendar npx tsx workers/index.ts
 */

async function main() {
    const type = process.env.WORKER_TYPE || "all";
    
    console.log(`[Worker] Starting with type: ${type}`);

    if (type === "all" || type === "calendar") {
        await startCalendarSyncWorker();
    }
    
    if (type === "all" || type === "jira") {
        await startJiraSyncWorker();
    }
    
    if (type === "all" || type === "github") {
        await startGitHubSyncWorker();
    }

    if (type === "all" || type === "email") {
        await startEmailSyncWorker();
    }
}

main().catch((err) => {
    console.error("[Worker] Fatal error:", err);
    process.exit(1);
});
