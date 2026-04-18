export interface IntegrationProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sync(): Promise<void>;
}

export type IntegrationType = "calendar" | "git" | "pm" | "design";
export type IntegrationProviderName = "google" | "outlook" | "github" | "gitlab" | "jira" | "figma";
