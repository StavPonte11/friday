# F.R.I.D.A.Y.
## Fast Robust Intelligent Digital Assistant Yield

Welcome to **F.R.I.D.A.Y.**, the next-generation orchestration platform designed to bridge the gap between autonomous AI agents and complex, real-world productivity. F.R.I.D.A.Y. provides the infrastructure, observability, and tools necessary for multi-agent systems to collaborate with precision and reliability.

---

## 🎯 Mission
Our mission is to empower developers and organizations to build, deploy, and scale robust AI agent ecosystems that can handle non-trivial tasks with human-like reasoning and machine-like efficiency.

## 👁️ Vision
To become the definitive backbone of the "Agentic Web," where intelligent assistants seamlessly manage projects, monitor their own performance, and evolve through continuous observation and precise prompt engineering.

---

## ✨ Full Feature List

### 🤖 Core Orchestration
- **Multi-Agent Collaboration**: Support for parallel agents working on independent tasks with shared or isolated states.
- **Dynamic Skill Injection**: Ability to load the most relevant "skills" (custom scripts, instructions, resources) into agent context on-the-fly.
- **Agentic Workflows**: Pre-defined and custom-built step-by-step guides for complex multi-tool operations.
- **Strict Typing & Validation**: Zero-tolerance policy for `any` types, ensuring domain integrity across all agent actions.

### 📋 Friday PM (Project Management Module)
- **Intelligent Issue Tracking**: Create, list, and update issues via natural language or MCP-compatible tools.
- **Sprint & Backlog Management**: Organize work into sprints, backlogs, and boards with AI-driven health analysis.
- **AI-Generated Requirements**: Transform vague descriptions into well-structured technical issues and acceptance criteria.
- **Live Board Visualization**: Real-time updates for project progress with a sleek Kanban-style interface.

### 🔍 Friday Traces (AI Observability Module)
- **Deep Session Inspection**: Complete trace history for every agent interaction, including input, output, and internal reasoning steps.
- **Prompt Management**: Centralized versioning and deployment of LLM prompts via Langfuse integration.
- **Precision Metrics**: Real-time tracking of token usage, latency, cost, and success rates.
- **Telemetry Export**: Support for OTLP and OpenTelemetry standards for enterprise-grade monitoring.

### 🛠️ Developer Experience
- **MCP Tool Integration**: Built-in support for the Model Context Protocol (MCP) to extend agent capabilities with external services.
- **Robust Mocking Layer**: Integrated MSW (Mock Service Worker) for reliable, isolated testing of both frontend and backend.
- **Advanced Testing Suite**: Comprehensive coverage with Vitest/Jest for unit tests and Playwright for E2E/visual regression testing.
- **Type-Safe API Design**: Built on tRPC and Zod for end-to-end type safety from the server to the browser.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js 20+**
- **npm** or **pnpm**
- **Langfuse Account** (for observability)

### 2. Installation
```bash
npm install
```

### 3. Environment Setup
Copy `.env.example` to `.env.local` and configure your keys:
```env
# Langfuse Observability
LANGFUSE_PUBLIC_KEY="pk-..."
LANGFUSE_SECRET_KEY="sk-..."

# GitLab / Infrastructure (Optional)
GITLAB_TOKEN="gl-..."

# Prisma / Database
DATABASE_URL="postgresql://..."
```

### 4. Running the Development Server
```bash
npm run dev
```

> [!TIP]
> **Performance Tip**: If your directory path contains only ASCII characters, use `next dev --turbo` for significantly faster build times.

---

## 🏗️ Project Architecture

```text
app/          -> Next.js App Router & API Layers
components/   -> Specialized UI components (PM, Traces, Core)
packages/     -> Shared modules: db, mcp-tools, module-sdk
lib/          -> Core engine, utilities, and integrations
types/        -> Global domain models (Strictly Typed)
e2e/          -> Playwright test suites
```

---

## 🛡️ Agentic Guidelines

F.R.I.D.A.Y. is "Agent-Ready." AI Agents operating on this repository **MUST**:
1. **Prioritize Skills**: Always check `.agent/skills/` before complex implementations.
2. **Defend the Types**: Use Zod schemas and TypeScript interfaces for all external data.
3. **Trace Everything**: Ensure every new feature is instrumented for observability.
4. **Verify before Claiming**: Run `npm run test:all` before assuming success.

---

Built with ❤️ by the F.R.I.D.A.Y. Team.
