# F.R.I.D.A.Y. - AI Agent Platform

Welcome to **F.R.I.D.A.Y.**, a production-grade orchestration platform built for multi-agent collaboration, prompt engineering, and precise observability.

This project is built using:
- **Next.js 16 (React 19)** - App Router frontend and API routes.
- **TypeScript** - Strongly typed logic and interfaces.
- **Tailwind CSS & Shadcn/UI** - Styling and core component framework.
- **Jest & Playwright** - Comprehensive Unit, Integration, and End-to-End testing.
- **Langfuse** - Core observability, prompt management, and telemetry.
- **Mock Service Worker (MSW)** - API mocking for robust isolation during testing.

## Getting Started

### 1. Prerequisites
Ensure you have Node.js 20+ installed. F.R.I.D.A.Y. heavily utilizes modern ESM and Fetch APIs.

### 2. Installation
```bash
npm install
```

### 3. Environment Setup
Before starting the application or running tests, you must configure your environment variables. 
Copy `.env.example` (or create a new `.env.local` / `.env.test`) with the following keys mapped correctly. See `lib/env.ts` for schema validation:

```env
# Langfuse Observability
LANGFUSE_PUBLIC_KEY="pk-..."
LANGFUSE_SECRET_KEY="sk-..."
LANGFUSE_BASE_URL="https://cloud.langfuse.com"

# GitLab Webhooks (if applicable)
GITLAB_TOKEN="gl-..."
GITLAB_WEBHOOK_SECRET="your-webhook-secret"

# App Config
PLATFORM_ADMIN_ROLE="admin"
```

### 4. Running the Development Server
```bash
npm run dev
```
> [!WARNING]  
> **Turbopack Notice**: By default, `npm run dev` in F.R.I.D.A.Y runs Next.js with the traditional **Webpack** compiler (`next dev --webpack`). 
> 
> *Why?* Turbopack (the Next.js Rust compiler) currently features a known bug where it panics when the absolute directory path contains non-ASCII characters (e.g., Hebrew characters like `שולחן העבודה`). If your directory path is purely ASCII, you may safely launch the app using `next dev --turbo` for faster compilations.

Navigate to [http://localhost:3000](http://localhost:3000) to view the application.

---

## Project Architecture

### Directory Structure

- `app/`: Next.js App Router (Pages, Layouts, API Routes).
- `components/`: React UI components. Features categorized subfolders like `ui/` for Shadcn components, `observability/`, and `prompts/`.
- `hooks/`: Reusable React Hooks (e.g., `use-observability.ts`).
- `lib/`: Core backend logic, utilities, configuration parsing (`env.ts`), and API client adapters.
- `types/`: Global domain structures and interfaces (Strictly Typed).
- `tests/`: Jest suites for unit and backend integration logic. Includes MSW handlers.
- `e2e/`: Playwright suites handling end-to-end browser and visual regressions.
- `.agent/skills/`: Custom instructions and execution profiles specifically for AI agents augmenting this repository.

---

## Testing & Quality Assurance

F.R.I.D.A.Y employs a multi-tier testing strategy. 

### Commands

- **Unit & Integration (Jest)**:
  - `npm run test:unit` - Runs unit tests across both `lib/` (Node) and `components/` (JSDOM).
  - `npm run test:integration` - Runs API and external integration tests.
  - `npm run test:coverage` - Generates a Cobertura-compatible coverage report.
- **End-to-End (Playwright)**:
  - `npm run test:e2e` - Executes browser tests headlessly.
  - `npm run test:e2e:ui` - Opens the Playwright interactive UI.
- **Static Analysis**:
  - `npm run lint` - Runs ESLint.
  - `npx tsc --noEmit` - Validates strict TypeScript compilation.

> [!CAUTION]
> **Jest ESM Compatibility**: Jest currently struggles with pure ESM modules (like `until-async`). This repository utilizes Next.js compilation overrides to pass parsing. If significant ESM blockers arise in the future, migrating the test runner to **Vitest** is recommended.

---

## Agentic Guidelines

F.R.I.D.A.Y is maintained both by human developers and autonomous AI Agents. If you are an AI agent operating on this repository, you **MUST** adhere to the following strict guidelines:

1. **Typing Standards**: Absolutely **NO `any`** types. All domain models, API responses, and React component props must be explicitly typed (e.g., referring to `types/index.ts`). Verify types using `npx tsc --noEmit`.
2. **Defensive Programming**: When building features in `lib/` that communicate externally (e.g., `fetchLangfuseAPI`), you must implement robust `try/catch` flows, default fallbacks, and validate the existence of deeply nested objects before using them.
3. **Observability**: When adding new agent tasks or modifying existing endpoints, assure interactions are properly ingested by Langfuse (cost tracking, latencies, tokens). Refer to `components/observability/trace-table.tsx` for integration patterns.
4. **Skills First**: Before beginning heavy logic implementations, check the `.agent/skills/` directory using the `list_dir` tool. You must utilize these skills to retain project alignment and architectural coherence.
5. **No Blind Deployments**: Always run verification suites (`npm run test:all` and TypeScript compilation) prior to assuming a feature is complete.
