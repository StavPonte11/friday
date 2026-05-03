export interface IntegrationProvider {
  connect(authCode?: string): Promise<void>;
  refresh(): Promise<void>;
  disconnect(): Promise<void>;
  sync(direction: "pull" | "push" | "both"): Promise<void>;
}

export type IntegrationType = "calendar" | "git" | "pm" | "design";
export type IntegrationProviderName =
  | "google"
  | "outlook"
  | "github"
  | "gitlab"
  | "jira"
  | "figma";

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
  scope?: string;
}
