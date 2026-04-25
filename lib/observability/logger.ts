// Re-export from canonical location so both import paths resolve correctly.
// Some routers use @/lib/observability/logger, others use @/lib/audit — both work now.
export { auditLog } from "@/lib/audit";
