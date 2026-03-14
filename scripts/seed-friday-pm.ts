import prisma from "../lib/prisma";
/**
 * FRIDAY PM — Realistic Test Data Seed Script
 * Idempotent: safe to run multiple times. Uses upsert everywhere.
 *
 * Run with:  npx tsx scripts/seed-friday-pm.ts
 */

import { config } from "dotenv";
config({ path: ".env" });

import {  PmIssueStatus, PmIssuePriority } from "@prisma/client";
import { Langfuse } from "langfuse";


const langfuse = new Langfuse({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY ?? "pk-placeholder",
    secretKey: process.env.LANGFUSE_SECRET_KEY ?? "sk-placeholder",
    baseUrl: process.env.LANGFUSE_HOST ?? "https://cloud.langfuse.com",
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function daysAgo(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
}
function randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}
function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function slug(str: string): string {
    return str.toLowerCase().replace(/\s+/g, "-");
}

// ---------------------------------------------------------------------------
// Seed data definitions
// ---------------------------------------------------------------------------

const TEAMS = [
    { name: "Platform Team", members: ["alice", "bob", "charlie", "diana", "eve"] },
    { name: "AI Infrastructure Team", members: ["frank", "grace", "henry", "iris"] },
    { name: "Frontend Experience Team", members: ["jack", "karen", "liam", "mia", "noah"] },
    { name: "DevOps Team", members: ["olivia", "peter", "quinn", "rachel"] },
];

const DEVELOPERS: { slug: string; name: string; email: string; role: string }[] = [
    { slug: "alice", name: "Alice Chen", email: "alice@friday.dev", role: "Backend Engineer" },
    { slug: "bob", name: "Bob Martinez", email: "bob@friday.dev", role: "Backend Engineer" },
    { slug: "charlie", name: "Charlie Wang", email: "charlie@friday.dev", role: "Backend Engineer" },
    { slug: "diana", name: "Diana Park", email: "diana@friday.dev", role: "QA Engineer" },
    { slug: "eve", name: "Eve Johnson", email: "eve@friday.dev", role: "Team Lead" },
    { slug: "frank", name: "Frank Liu", email: "frank@friday.dev", role: "ML Engineer" },
    { slug: "grace", name: "Grace Kim", email: "grace@friday.dev", role: "ML Engineer" },
    { slug: "henry", name: "Henry Okafor", email: "henry@friday.dev", role: "Backend Engineer" },
    { slug: "iris", name: "Iris Nakamura", email: "iris@friday.dev", role: "Team Lead" },
    { slug: "jack", name: "Jack Thompson", email: "jack@friday.dev", role: "Frontend Engineer" },
    { slug: "karen", name: "Karen Singh", email: "karen@friday.dev", role: "Frontend Engineer" },
    { slug: "liam", name: "Liam O'Brien", email: "liam@friday.dev", role: "Frontend Engineer" },
    { slug: "mia", name: "Mia Rodriguez", email: "mia@friday.dev", role: "Frontend Engineer" },
    { slug: "noah", name: "Noah Cooper", email: "noah@friday.dev", role: "Team Lead" },
    { slug: "olivia", name: "Olivia Williams", email: "olivia@friday.dev", role: "DevOps Engineer" },
    { slug: "peter", name: "Peter Zhang", email: "peter@friday.dev", role: "DevOps Engineer" },
    { slug: "quinn", name: "Quinn Adams", email: "quinn@friday.dev", role: "DevOps Engineer" },
    { slug: "rachel", name: "Rachel Torres", email: "rachel@friday.dev", role: "Team Lead" },
];

const PROJECTS = [
    {
        key: "FCP",
        name: "FRIDAY Core Platform",
        description: "Core platform services: auth, workspace management, module orchestration, API gateway.",
    },
    {
        key: "AOE",
        name: "Agent Orchestration Engine",
        description: "LangGraph-based multi-agent execution framework: task scheduling, tool routing, agent state.",
    },
    {
        key: "OLI",
        name: "Observability & Langfuse Integration",
        description: "Full-stack observability: trace ingestion, dashboard metrics, cost tracking, LLM evals.",
    },
];

const LABEL_DEFS: { name: string; color: string }[] = [
    { name: "bug", color: "#ef4444" },
    { name: "feature", color: "#3b82f6" },
    { name: "refactor", color: "#8b5cf6" },
    { name: "infrastructure", color: "#f59e0b" },
    { name: "research", color: "#06b6d4" },
    { name: "ai-generated", color: "#10b981" },
    { name: "blocked", color: "#dc2626" },
    { name: "performance", color: "#f97316" },
    { name: "security", color: "#6b7280" },
    { name: "ui-ux", color: "#ec4899" },
    { name: "docs", color: "#84cc16" },
    { name: "testing", color: "#a78bfa" },
];

// Issue definitions per project (title, category, priority, complexity)
type IssueDef = {
    title: string;
    description: string;
    priority: PmIssuePriority;
    storyPoints: number;
    complexityScore: number;
    labels: string[];
    aiGenerated?: boolean;
};

const FCP_ISSUES: IssueDef[] = [
    { title: "Implement workspace SSO integration with Google OAuth", description: "Add Google OAuth2 provider to next-auth configuration. Ensure workspace member auto-provisioning on first login. Handle email domain restrictions.", priority: PmIssuePriority.HIGH, storyPoints: 5, complexityScore: 6, labels: ["feature", "security"] },
    { title: "Fix session expiry race condition on concurrent requests", description: "Under high load, concurrent API calls with an expiring session token cause 401 cascades. Implement optimistic token refresh with mutex lock.", priority: PmIssuePriority.URGENT, storyPoints: 3, complexityScore: 8, labels: ["bug", "security"] },
    { title: "Optimize workspace member query with index on workspaceId+userId", description: "The WorkspaceMember lookup is hitting sequential scans for large workspaces. Add composite index and verify query plan.", priority: PmIssuePriority.MEDIUM, storyPoints: 2, complexityScore: 4, labels: ["performance", "infrastructure"] },
    { title: "Build workspace settings page with module toggles", description: "Create settings UI allowing workspace admins to enable/disable modules (PM, Traces, etc.) and configure module-specific options.", priority: PmIssuePriority.HIGH, storyPoints: 5, complexityScore: 5, labels: ["feature", "ui-ux"] },
    { title: "Add audit log streaming to OpenTelemetry", description: "Pipe AuditLog events to OTEL spans so all administrative actions appear in the trace timeline.", priority: PmIssuePriority.MEDIUM, storyPoints: 3, complexityScore: 5, labels: ["infrastructure", "feature"] },
    { title: "Refactor ApiKey generation to use BLAKE3 hashing", description: "Replace current SHA-256 key hashing with BLAKE3 for improved performance. Migrate existing keys in a backwards-compatible way.", priority: PmIssuePriority.LOW, storyPoints: 2, complexityScore: 4, labels: ["refactor", "security"] },
    { title: "Implement API key usage rate limiting (per workspace)", description: "Add a Redis-backed rate limiter middleware applied to all API key authenticated routes. Support configurable limits per workspace tier.", priority: PmIssuePriority.HIGH, storyPoints: 5, complexityScore: 7, labels: ["feature", "infrastructure"] },
    { title: "Create system health check endpoint /api/health", description: "Expose a structured health check returning DB connectivity, Redis availability, and external service latency. Used by load balancer probes.", priority: PmIssuePriority.MEDIUM, storyPoints: 2, complexityScore: 3, labels: ["infrastructure"] },
    { title: "Fix CORS headers missing on /api/trpc/* in production", description: "The tRPC route handler does not set CORS headers when deployed behind CDN. Add a Next.js middleware to apply correct headers.", priority: PmIssuePriority.URGENT, storyPoints: 1, complexityScore: 3, labels: ["bug"] },
    { title: "Add pagination to workspace member list API", description: "The workspaceMembers query returns all records with no limit. Add cursor-based pagination for workspaces with 100+ members.", priority: PmIssuePriority.MEDIUM, storyPoints: 3, complexityScore: 4, labels: ["feature", "performance"] },
    { title: "Implement invite-by-email flow with JWT magic links", description: "Allow workspace admins to invite new members via email. Generate time-limited JWT magic links, verify on click, and provision WorkspaceMember.", priority: PmIssuePriority.HIGH, storyPoints: 8, complexityScore: 7, labels: ["feature"] },
    { title: "Write E2E tests for workspace creation and invite flow", description: "Playwright tests covering: create workspace → invite member → accept invite → verify role assignment.", priority: PmIssuePriority.MEDIUM, storyPoints: 3, complexityScore: 4, labels: ["testing"] },
    { title: "Add feature flag system for experimental features", description: "Implement a lightweight feature flag layer using the WorkspaceModule config JSON. Support percentage rollout and explicit overrides per workspace.", priority: PmIssuePriority.LOW, storyPoints: 5, complexityScore: 6, labels: ["feature", "infrastructure"] },
    { title: "Investigate memory leak in Next.js middleware on long-running deploy", description: "Heap profiling shows steady growth after 48h uptime. Suspect closure capturing request objects. Bisect and fix.", priority: PmIssuePriority.URGENT, storyPoints: 3, complexityScore: 9, labels: ["bug", "performance"] },
    { title: "Document workspace API endpoints in OpenAPI 3.1 spec", description: "Generate OpenAPI spec from tRPC router types for the workspaces and auth routes. Serve via /api/docs.", priority: PmIssuePriority.LOW, storyPoints: 3, complexityScore: 3, labels: ["docs"] },
    { title: "Migrate module config from JSON to typed Zod schema", description: "Replace the freeform module config JSON blob with Zod-validated typed configs per module. Maintain backwards compatibility.", priority: PmIssuePriority.MEDIUM, storyPoints: 3, complexityScore: 5, labels: ["refactor"] },
    { title: "Add dark mode toggle with system preference detection", description: "Add next-themes toggle to the settings page. Default to system preference, persist selection to localStorage.", priority: PmIssuePriority.LOW, storyPoints: 2, complexityScore: 2, labels: ["ui-ux", "feature"] },
    { title: "Research: evaluate moving to Turborepo for monorepo builds", description: "Benchmark build times with Turborepo caching vs current npm workspaces. Document findings and migration steps if beneficial.", priority: PmIssuePriority.LOW, storyPoints: 3, complexityScore: 4, labels: ["research", "infrastructure"] },
    { title: "Add automated sprint planning support using AI backlog analysis", description: "AI-generated: Implement LangChain-based sprint planner that reads backlog complexity scores and velocity history to recommend optimal sprint scope.", priority: PmIssuePriority.HIGH, storyPoints: 8, complexityScore: 8, labels: ["feature", "ai-generated"], aiGenerated: true },
    { title: "Implement real-time board updates via WebSocket", description: "Use socket.io rooms per project to broadcast status changes in real-time to all connected board viewers.", priority: PmIssuePriority.HIGH, storyPoints: 5, complexityScore: 7, labels: ["feature"] },
    { title: "Add issue dependency tracking and blocking logic", description: "Allow issues to mark other issues as blockers. UI shows dependency graph icon. API validates circular dependencies.", priority: PmIssuePriority.MEDIUM, storyPoints: 5, complexityScore: 7, labels: ["feature"] },
    { title: "Fix issue counter desync after optimistic UI update", description: "Sprint issue count badge shows stale value after drag-and-drop until page refresh. Invalidate correct TanStack Query key.", priority: PmIssuePriority.HIGH, storyPoints: 1, complexityScore: 3, labels: ["bug", "ui-ux"] },
    { title: "Create email digest for blocked issues", description: "Send a daily Resend email to team leads listing all issues in BLOCKED status older than 2 days.", priority: PmIssuePriority.MEDIUM, storyPoints: 3, complexityScore: 5, labels: ["feature"] },
    { title: "Build custom CSV export for issue list", description: "Add export button to issue list that downloads a CSV with all visible fields. Respect active filters.", priority: PmIssuePriority.LOW, storyPoints: 2, complexityScore: 3, labels: ["feature"] },
    { title: "Refactor Prisma client initialization to singleton pattern", description: "Multiple files instantiate PrismaClient directly causing connection pool exhaustion. Centralize to lib/prisma.ts singleton.", priority: PmIssuePriority.HIGH, storyPoints: 2, complexityScore: 3, labels: ["refactor", "performance"] },
];

const AOE_ISSUES: IssueDef[] = [
    { title: "Implement LangGraph agent state persistence via Redis", description: "Store agent execution states in Redis with TTL-based expiry. Support resume from checkpoint on timeout or crash.", priority: PmIssuePriority.URGENT, storyPoints: 8, complexityScore: 9, labels: ["feature", "infrastructure"] },
    { title: "Build tool router with dynamic capability discovery", description: "Create an MCP-compatible tool router that introspects available tools at runtime and routes LLM function calls accordingly.", priority: PmIssuePriority.HIGH, storyPoints: 8, complexityScore: 8, labels: ["feature", "ai-generated"], aiGenerated: true },
    { title: "Add retry logic with exponential backoff for LLM API calls", description: "Wrap all OpenAI and Anthropic calls with a retry middleware. Support configurable max retries, backoff, and jitter.", priority: PmIssuePriority.HIGH, storyPoints: 3, complexityScore: 5, labels: ["feature", "infrastructure"] },
    { title: "Implement agent task queue using RabbitMQ/AMQP", description: "Move long-running agent tasks to background queue via amqplib. Add dead-letter queues for failed tasks and alerting.", priority: PmIssuePriority.HIGH, storyPoints: 8, complexityScore: 9, labels: ["infrastructure", "feature"] },
    { title: "Fix agent memory leaking between concurrent executions", description: "Shared mutable state in LangGraph nodes causes result contamination under parallel execution. Isolate per-run state with closure.", priority: PmIssuePriority.URGENT, storyPoints: 3, complexityScore: 8, labels: ["bug", "performance"] },
    { title: "Add streaming response support for agent output", description: "Stream LLM tokens back to the client as they are generated using Server-Sent Events or tRPC subscriptions.", priority: PmIssuePriority.HIGH, storyPoints: 5, complexityScore: 7, labels: ["feature"] },
    { title: "Research: Evaluate Temporal.io for durable agent workflows", description: "Assess Temporal as replacement for custom queue-based orchestration. Prototype a simple workflow and document latency impact.", priority: PmIssuePriority.MEDIUM, storyPoints: 5, complexityScore: 6, labels: ["research"] },
    { title: "Implement agent cost tracking with per-run token budgets", description: "Track input/output tokens per agent run. Emit cost estimate to Langfuse. Kill runs exceeding configured token budget.", priority: PmIssuePriority.HIGH, storyPoints: 5, complexityScore: 6, labels: ["feature", "infrastructure"] },
    { title: "Create agent playground UI for testing tool configurations", description: "Build a web UI where engineers can run agents with custom configurations, view trace, and compare outputs.", priority: PmIssuePriority.MEDIUM, storyPoints: 8, complexityScore: 7, labels: ["feature", "ui-ux"] },
    { title: "Add multi-step reasoning chain visualization", description: "Parse LangGraph execution graph and render as an interactive DAG in the UI showing each step's input/output.", priority: PmIssuePriority.MEDIUM, storyPoints: 8, complexityScore: 8, labels: ["feature", "ui-ux"] },
    { title: "Refactor tool definitions to use JSON Schema instead of ad-hoc types", description: "Standardize all MCP tool input schemas to JSON Schema Draft 7 and validate with Ajv at runtime.", priority: PmIssuePriority.MEDIUM, storyPoints: 3, complexityScore: 5, labels: ["refactor"] },
    { title: "Implement supervisor agent for multi-agent coordination", description: "Build a supervisor that delegates subtasks to specialized sub-agents (PM, code review, research) and aggregates results.", priority: PmIssuePriority.HIGH, storyPoints: 13, complexityScore: 10, labels: ["feature", "ai-generated"], aiGenerated: true },
    { title: "Add structured logging to all agent lifecycle events", description: "Emit JSON-structured logs at agent start, step completion, tool call, and agent end. Include trace/span IDs for correlation.", priority: PmIssuePriority.MEDIUM, storyPoints: 2, complexityScore: 3, labels: ["infrastructure"] },
    { title: "Design agent permission model (read-only vs mutating tools)", description: "Define a tiered permission model where agents must declare required permissions. Block dangerous tools behind explicit allowlist.", priority: PmIssuePriority.HIGH, storyPoints: 5, complexityScore: 7, labels: ["feature", "security", "research"] },
    { title: "Fix: tool output not deserialized correctly for array types", description: "When a tool returns an array, the JSON deserialization strips type info causing downstream type errors in LangGraph nodes.", priority: PmIssuePriority.HIGH, storyPoints: 2, complexityScore: 5, labels: ["bug"] },
    { title: "Write unit tests for tool router dispatch logic", description: "100% coverage on the routing algorithm: correct tool selected, fallback on unknown tool, error on missing required params.", priority: PmIssuePriority.MEDIUM, storyPoints: 3, complexityScore: 4, labels: ["testing"] },
    { title: "Add human-in-the-loop checkpoint for high-impact agent actions", description: "Pause agent execution before any mutating action (issue creation, code push) and await explicit human approval via UI.", priority: PmIssuePriority.HIGH, storyPoints: 8, complexityScore: 9, labels: ["feature", "security"] },
    { title: "Implement agent output caching with semantic deduplication", description: "Cache identical or semantically equivalent agent prompts with vector similarity check to avoid redundant LLM calls.", priority: PmIssuePriority.MEDIUM, storyPoints: 5, complexityScore: 7, labels: ["performance", "infrastructure"] },
    { title: "Create AMQP consumer health monitor with auto-restart", description: "Monitor consumer activity. If a consumer goes idle or disconnects, automatically restart and emit alert.", priority: PmIssuePriority.MEDIUM, storyPoints: 3, complexityScore: 5, labels: ["infrastructure"] },
    { title: "Document agent architecture in ADR-001", description: "Write Architecture Decision Record for the LangGraph + AMQP + Redis agent architecture. Include tradeoffs and alternatives.", priority: PmIssuePriority.LOW, storyPoints: 2, complexityScore: 2, labels: ["docs"] },
    { title: "Benchmark agent throughput: 10 concurrent runs", description: "Stress test the agent execution pipeline with 10 parallel runs. Measure latency, memory usage, and queue backpressure.", priority: PmIssuePriority.MEDIUM, storyPoints: 3, complexityScore: 5, labels: ["testing", "performance"] },
    { title: "Add Zod validation for all agent input/output schemas", description: "Ensure every agent receives validated typed input and produces validated output before returning to caller.", priority: PmIssuePriority.HIGH, storyPoints: 3, complexityScore: 4, labels: ["refactor"] },
    { title: "Support structured agent output with fallback extraction", description: "When the LLM returns malformed structured output, apply a repair wrapper using instructor-style reprompting.", priority: PmIssuePriority.MEDIUM, storyPoints: 3, complexityScore: 6, labels: ["feature"] },
    { title: "Add model routing: cheapest model per task complexity tier", description: "Route simple tasks to gpt-4o-mini and complex ones to gpt-4o based on issue complexity score. Measure cost savings.", priority: PmIssuePriority.MEDIUM, storyPoints: 5, complexityScore: 6, labels: ["feature", "performance"] },
    { title: "Build issue-to-code mapping: link issues to git commits", description: "Parse commit messages for issue keys (e.g. AOE-42) and create bidirectional links in the issue detail view.", priority: PmIssuePriority.LOW, storyPoints: 5, complexityScore: 6, labels: ["feature"] },
];

const OLI_ISSUES: IssueDef[] = [
    { title: "Optimize Langfuse trace ingestion throughput (target: 10k/min)", description: "Profile the current ingestion pipeline. Batch writes to Langfuse, implement connection pooling, and measure throughput improvement.", priority: PmIssuePriority.URGENT, storyPoints: 8, complexityScore: 9, labels: ["performance", "infrastructure"] },
    { title: "Add cost tracking dashboard: tokens and USD per model", description: "Create a dashboard tab showing token usage broken down by model and LLM call type. Calculate USD cost using OpenAI pricing API.", priority: PmIssuePriority.HIGH, storyPoints: 5, complexityScore: 6, labels: ["feature", "ui-ux"] },
    { title: "Implement LLM-as-judge evaluation pipeline", description: "Build an async eval pipeline that routes completed LLM outputs through a judge model (gpt-4o) and stores scores in Langfuse datasets.", priority: PmIssuePriority.HIGH, storyPoints: 8, complexityScore: 8, labels: ["feature", "ai-generated"], aiGenerated: true },
    { title: "Fix trace correlation breaking under distributed load", description: "Trace IDs are not propagated correctly when requests span multiple Next.js API routes. Add OTEL context propagation middleware.", priority: PmIssuePriority.URGENT, storyPoints: 5, complexityScore: 8, labels: ["bug", "infrastructure"] },
    { title: "Build alerting dashboard for latency SLA breaches", description: "Alert team when p95 latency exceeds 2s for any observed tRPC route over a 5-minute window. Display alerts on the observability dashboard.", priority: PmIssuePriority.HIGH, storyPoints: 5, complexityScore: 7, labels: ["feature", "infrastructure"] },
    { title: "Create weekly LLM cost digest email for engineering leadership", description: "Aggregate weekly Langfuse usage stats and send a Resend email to leadership summarizing model spend, top operations, and trends.", priority: PmIssuePriority.MEDIUM, storyPoints: 3, complexityScore: 5, labels: ["feature"] },
    { title: "Integrate Prometheus metrics export for FRIDAY API routes", description: "Expose /metrics endpoint in Prometheus format with request count, latency histograms, and error rates per route.", priority: PmIssuePriority.HIGH, storyPoints: 5, complexityScore: 7, labels: ["infrastructure", "feature"] },
    { title: "Implement trace sampling strategy (1% of board loads, 100% of errors)", description: "Add adaptive trace sampling: 100% for errors, 100% for AI operations, 1% for read-only page loads.", priority: PmIssuePriority.MEDIUM, storyPoints: 3, complexityScore: 5, labels: ["infrastructure", "performance"] },
    { title: "Research: evaluate Grafana vs custom dashboard for trace visualization", description: "Compare Grafana LGTM stack vs custom Recharts dashboard for showing Langfuse metrics. Prototype both and document tradeoffs.", priority: PmIssuePriority.LOW, storyPoints: 5, complexityScore: 5, labels: ["research"] },
    { title: "Add structured error envelope to all tRPC error responses", description: "Standardize error responses: { code, message, requestId, traceId }. Ensure traceId always matches the Langfuse span.", priority: PmIssuePriority.MEDIUM, storyPoints: 3, complexityScore: 4, labels: ["refactor", "infrastructure"] },
    { title: "Write Langfuse SDK integration tests", description: "Verify that traces, spans, and generations are correctly sent to Langfuse with expected metadata. Use Langfuse test project.", priority: PmIssuePriority.MEDIUM, storyPoints: 3, complexityScore: 5, labels: ["testing"] },
    { title: "Implement trace replay for debugging failed agent runs", description: "Allow engineers to replay a trace by re-running the same input through the same model/tools. Show diff between original and replay.", priority: PmIssuePriority.LOW, storyPoints: 8, complexityScore: 9, labels: ["feature", "research"] },
    { title: "Create real-time error rate widget for the analytics page", description: "Display a live-updating error rate graph on the analytics dashboard pulling from Langfuse trace error metadata.", priority: PmIssuePriority.MEDIUM, storyPoints: 3, complexityScore: 5, labels: ["feature", "ui-ux"] },
    { title: "Add OTEL auto-instrumentation for Prisma queries", description: "Enable @opentelemetry/auto-instrumentations-node for Prisma to automatically capture query latencies. Verify spans appear in trace.", priority: PmIssuePriority.HIGH, storyPoints: 2, complexityScore: 4, labels: ["infrastructure"] },
    { title: "Build per-developer productivity dashboard (issues/week, cycle time)", description: "Create a private dashboard view showing each developer's velocity metrics, average cycle time, and current WIP load.", priority: PmIssuePriority.MEDIUM, storyPoints: 5, complexityScore: 6, labels: ["feature", "ui-ux", "ai-generated"], aiGenerated: true },
    { title: "Trace session events: login, logout, and workspace switches", description: "Emit Langfuse traces for all authentication events to track user session lifecycle for security analytics.", priority: PmIssuePriority.MEDIUM, storyPoints: 2, complexityScore: 3, labels: ["infrastructure", "security"] },
    { title: "Fix: generation traces missing parent spanId in nested calls", description: "When generateIssueInsights is called from within generateSprintPlan, the child trace loses reference to parent span.", priority: PmIssuePriority.HIGH, storyPoints: 2, complexityScore: 5, labels: ["bug"] },
    { title: "Create trace dashboard filter: by project, date range, status", description: "Add filter controls to the traces page: filter by project ID, date range, and success/failure status.", priority: PmIssuePriority.MEDIUM, storyPoints: 3, complexityScore: 4, labels: ["feature", "ui-ux"] },
    { title: "Implement automatic eval scoring for AI-generated issues", description: "For every pm.ai.issue.generate trace, run async LLM-as-judge evaluation scoring quality (0-10) and store in Langfuse.", priority: PmIssuePriority.HIGH, storyPoints: 5, complexityScore: 7, labels: ["feature", "ai-generated"], aiGenerated: true },
    { title: "Document observability architecture in OLI-ADR-001", description: "Write ADR for OTEL + Langfuse + Prometheus integration. Include data flow diagram and sampling decisions.", priority: PmIssuePriority.LOW, storyPoints: 2, complexityScore: 2, labels: ["docs"] },
    { title: "Add Langfuse score for sprint planning recommendation accuracy", description: "After each pm.ai.sprint.recommend trace, compute an accuracy score by comparing recommended vs actually completed issue IDs.", priority: PmIssuePriority.MEDIUM, storyPoints: 3, complexityScore: 6, labels: ["feature"] },
    { title: "Stress test: 500 issues, 10 concurrent board loads", description: "Run a Playwright-based stress test with 10 browser contexts loading the board simultaneously with 500 issues seeded.", priority: PmIssuePriority.HIGH, storyPoints: 3, complexityScore: 5, labels: ["testing", "performance"] },
    { title: "Create Langfuse prompt management integration", description: "Register all system prompts used by FRIDAY AI features in Langfuse Prompt Management for versioning and A/B testing.", priority: PmIssuePriority.LOW, storyPoints: 3, complexityScore: 5, labels: ["feature"] },
    { title: "Add webhook support for issuing alerts on LLM cost thresholds", description: "Fire a configurable webhook when the 7-day rolling LLM cost exceeds a threshold. Support Slack and generic HTTP targets.", priority: PmIssuePriority.MEDIUM, storyPoints: 3, complexityScore: 5, labels: ["feature", "infrastructure"] },
    { title: "Refactor traces router to support per-trace detail view", description: "Extend the traces tRPC router with getById and add a trace detail page showing all spans and their metadata in a tree view.", priority: PmIssuePriority.MEDIUM, storyPoints: 5, complexityScore: 6, labels: ["feature", "refactor"] },
];

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
    const startTime = Date.now();
    console.log("🌱 FRIDAY PM — Seeding realistic test environment...\n");

    // 1. Workspace
    const workspace = await prisma.workspace.upsert({
        where: { slug: "engineering-division" },
        update: { name: "Engineering Division" },
        create: { name: "Engineering Division", slug: "engineering-division" },
    });
    console.log(`✅ Workspace: ${workspace.name} (${workspace.id})`);

    // 2. Enable PM module
    await prisma.workspaceModule.upsert({
        where: { workspaceId_moduleId: { workspaceId: workspace.id, moduleId: "pm" } },
        update: { enabled: true },
        create: { workspaceId: workspace.id, moduleId: "pm", enabled: true },
    });

    // 3. Users
    const userMap: Record<string, { id: string; name: string }> = {};
    for (const dev of DEVELOPERS) {
        const user = await prisma.user.upsert({
            where: { email: dev.email },
            update: { name: dev.name },
            create: { name: dev.name, email: dev.email, image: `https://api.dicebear.com/9.x/personas/svg?seed=${dev.slug}` },
        });
        await prisma.workspaceMember.upsert({
            where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
            update: {},
            create: { workspaceId: workspace.id, userId: user.id, role: dev.role.includes("Lead") ? "ADMIN" : "MEMBER" },
        });
        userMap[dev.slug] = { id: user.id, name: dev.name };
    }
    console.log(`✅ Users seeded: ${DEVELOPERS.length} developers`);

    // 4. Labels
    const labelMap: Record<string, string> = {};
    for (const lbl of LABEL_DEFS) {
        const label = await prisma.pmLabel.upsert({
            where: { id: `label-${slug(lbl.name)}-${workspace.id}` },
            update: { color: lbl.color },
            create: { id: `label-${slug(lbl.name)}-${workspace.id}`, workspaceId: workspace.id, name: lbl.name, color: lbl.color },
        });
        labelMap[lbl.name] = label.id;
    }
    console.log(`✅ Labels seeded: ${LABEL_DEFS.length}`);

    // 5. Projects + sprints + issues
    const projectData = [
        { def: PROJECTS[0], issues: FCP_ISSUES, devSlugs: TEAMS[0].members },
        { def: PROJECTS[1], issues: AOE_ISSUES, devSlugs: TEAMS[1].members },
        { def: PROJECTS[2], issues: OLI_ISSUES, devSlugs: TEAMS[2].members },
    ];

    let totalIssues = 0;

    for (const { def, issues, devSlugs } of projectData) {
        const project = await prisma.pmProject.upsert({
            where: { key: def.key },
            update: { name: def.name, description: def.description },
            create: { workspaceId: workspace.id, key: def.key, name: def.name, description: def.description },
        });
        console.log(`\n📁 Project: ${project.name} (${project.key})`);

        // Create 4 sprints per project
        const sprintDefs = [
            { name: `Sprint 10`, goal: "Foundation and core stabilisation", status: "COMPLETED", startDate: daysAgo(56), endDate: daysAgo(42) },
            { name: `Sprint 11`, goal: "Performance improvements and bug triage", status: "COMPLETED", startDate: daysAgo(42), endDate: daysAgo(28) },
            { name: `Sprint 12`, goal: "AI feature rollout and observability", status: "COMPLETED", startDate: daysAgo(28), endDate: daysAgo(14) },
            { name: `Sprint 13`, goal: "Current sprint — agent integration", status: "ACTIVE", startDate: daysAgo(14), endDate: daysAgo(-0) },
        ];

        const sprintIds: string[] = [];
        for (const sd of sprintDefs) {
            const sprintId = `sprint-${def.key}-${sd.name.replace(" ", "-")}`;
            const sprint = await prisma.pmSprint.upsert({
                where: { id: sprintId },
                update: { status: sd.status },
                create: {
                    id: sprintId,
                    projectId: project.id,
                    name: `[${def.key}] ${sd.name}`,
                    goal: sd.goal,
                    startDate: sd.startDate,
                    endDate: sd.endDate,
                    status: sd.status,
                },
            });
            sprintIds.push(sprint.id);
        }
        console.log(`  🏃 Sprints created: ${sprintDefs.length}`);

        const devUsers = devSlugs.map(s => userMap[s]).filter(Boolean);
        const teamLead = devUsers[devUsers.length - 1]; // last is team lead

        // Distribute issues across sprints and backlog
        let counter = 1;
        for (const issue of issues) {
            const issueKey = `${def.key}-${counter}`;
            const createdAt = daysAgo(randomInt(2, 60));

            // Determine sprint assignment and status
            let sprintId: string | null = null;
            let status: PmIssueStatus = PmIssueStatus.BACKLOG;

            if (counter <= 6) {
                // Sprint 10 — all done
                sprintId = sprintIds[0];
                status = PmIssueStatus.DONE;
            } else if (counter <= 12) {
                // Sprint 11 — mostly done, some canceled
                sprintId = sprintIds[1];
                status = counter === 12 ? PmIssueStatus.CANCELED : PmIssueStatus.DONE;
            } else if (counter <= 18) {
                // Sprint 12 — done except 1 blocked
                sprintId = sprintIds[2];
                status = counter === 18 ? PmIssueStatus.IN_REVIEW : PmIssueStatus.DONE;
            } else if (counter <= 24) {
                // Sprint 13 (active) — various statuses
                sprintId = sprintIds[3];
                const roll = counter % 4;
                status = roll === 0 ? PmIssueStatus.TODO : roll === 1 ? PmIssueStatus.IN_PROGRESS : roll === 2 ? PmIssueStatus.IN_REVIEW : PmIssueStatus.TODO;
            } else {
                // Backlog
                sprintId = null;
                status = PmIssueStatus.BACKLOG;
            }

            const assignee = status === PmIssueStatus.BACKLOG ? null : randomFrom(devUsers);

            await prisma.pmIssue.upsert({
                where: { key: issueKey },
                update: { status, sprintId },
                create: {
                    key: issueKey,
                    projectId: project.id,
                    title: issue.title,
                    description: issue.description,
                    status,
                    priority: issue.priority,
                    storyPoints: issue.storyPoints,
                    complexityScore: issue.complexityScore,
                    predictedTime: `${randomInt(1, 5)} days`,
                    assigneeId: assignee?.id ?? null,
                    creatorId: teamLead.id,
                    sprintId,
                    createdAt,
                    updatedAt: new Date(),
                    labels: issue.labels.filter(l => labelMap[l]).length > 0
                        ? { connect: issue.labels.filter(l => labelMap[l]).map(l => ({ id: labelMap[l] })) }
                        : undefined,
                },
            });

            // Emit Langfuse trace for issue creation
            langfuse.trace({
                name: issue.aiGenerated ? "pm.ai.issue.generate" : "pm.issue.create",
                userId: teamLead.id,
                metadata: {
                    issueKey,
                    projectId: project.id,
                    priority: issue.priority,
                    aiGenerated: issue.aiGenerated ?? false,
                    latencyMs: randomInt(40, 350),
                    success: true,
                },
                timestamp: createdAt,
            });

            // Add a review comment on done issues
            if (status === PmIssueStatus.DONE && assignee) {
                const existingIssue = await prisma.pmIssue.findUnique({ where: { key: issueKey } });
                if (existingIssue) {
                    const commentId = `comment-${issueKey}-done`;
                    const existing = await prisma.pmComment.findUnique({ where: { id: commentId } });
                    if (!existing) {
                        await prisma.pmComment.create({
                            data: {
                                id: commentId,
                                issueId: existingIssue.id,
                                authorId: assignee.id,
                                content: `✅ Completed and merged. All acceptance criteria verified.`,
                                createdAt: new Date(createdAt.getTime() + randomInt(1, 5) * 86400000),
                            },
                        });
                    }
                }
            }

            counter++;
            totalIssues++;
        }

        // Emit sprint planning traces
        for (const sprintId of sprintIds.slice(0, 3)) {
            langfuse.trace({
                name: "pm.sprint.plan",
                userId: teamLead.id,
                metadata: { projectId: project.id, sprintId, latencyMs: randomInt(200, 800), success: true },
            });
        }

        console.log(`  📋 Issues seeded: ${issues.length}`);
    }

    await langfuse.flushAsync();

    const elapsed = Date.now() - startTime;
    console.log(`\n🎉 Seed complete in ${elapsed}ms`);
    console.log(`   Total issues: ${totalIssues}`);
    console.log(`   Total users:  ${DEVELOPERS.length}`);
    console.log(`   Projects:     ${PROJECTS.length}`);
    console.log(`   Langfuse traces flushed ✅`);
}

main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
        console.error("❌ Seed failed:", e);
        await prisma.$disconnect();
        process.exit(1);
    });
