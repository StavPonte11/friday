/**
 * Integration Analytics
 * Emits structured events via Langfuse for all integration lifecycle actions.
 * Satisfies the requirement: integration.connected | integration.synced | integration.error
 */

import { langfuse } from "@/lib/langfuse";

type IntegrationEventType =
  | "integration.connected"
  | "integration.disconnected"
  | "integration.synced"
  | "integration.error"
  | "integration.oauth.initiated"
  | "integration.oauth.completed";

interface IntegrationEventPayload {
  userId?: string;
  workspaceId?: string;
  provider: string;
  type: string; // "calendar" | "git" | "design"
  direction?: "push" | "pull" | "both";
  error?: string;
  metadata?: Record<string, unknown>;
}

export function traceIntegrationEvent(
  event: IntegrationEventType,
  payload: IntegrationEventPayload,
): void {
  langfuse.trace({
    name: event,
    userId: payload.userId,
    metadata: {
      provider: payload.provider,
      integrationType: payload.type,
      direction: payload.direction,
      workspaceId: payload.workspaceId,
      error: payload.error,
      ...payload.metadata,
    },
    tags: [event, payload.provider, payload.type],
  });
}
