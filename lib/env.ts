import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    LANGFUSE_PUBLIC_KEY: z.string().optional(),
    LANGFUSE_SECRET_KEY: z.string().optional(),
    LANGFUSE_BASE_URL: z.string().url().default("https://cloud.langfuse.com"),
    GITLAB_TOKEN: z.string().optional(),
    GITLAB_WEBHOOK_SECRET: z.string().optional(),
    GITLAB_BASE_URL: z.string().url().default("https://gitlab.com"),
    PLATFORM_ADMIN_ROLE: z.string().default("admin"),
    
    // Extensibility & AI
    ON_PREM_MODE: z.coerce.boolean().default(false),
    AI_PROVIDER: z.string().default("openai"),
    LLM_URL: z.string().optional(),
    LLM_API_KEY: z.string().optional(),
    AI_MODEL: z.string().optional(),
  },
  client: {},
  runtimeEnv: {
    LANGFUSE_PUBLIC_KEY: process.env.LANGFUSE_PUBLIC_KEY,
    LANGFUSE_SECRET_KEY: process.env.LANGFUSE_SECRET_KEY,
    LANGFUSE_BASE_URL: process.env.LANGFUSE_BASE_URL,
    GITLAB_TOKEN: process.env.GITLAB_TOKEN,
    GITLAB_WEBHOOK_SECRET: process.env.GITLAB_WEBHOOK_SECRET,
    GITLAB_BASE_URL: process.env.GITLAB_BASE_URL,
    PLATFORM_ADMIN_ROLE: process.env.PLATFORM_ADMIN_ROLE,
    ON_PREM_MODE: process.env.ON_PREM_MODE,
    AI_PROVIDER: process.env.AI_PROVIDER,
    LLM_URL: process.env.LLM_URL,
    LLM_API_KEY: process.env.LLM_API_KEY,
    AI_MODEL: process.env.AI_MODEL,
  },
  skipValidation: process.env.NODE_ENV === "test",
});
