import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    LANGFUSE_PUBLIC_KEY: z.string().min(1),
    LANGFUSE_SECRET_KEY: z.string().min(1),
    LANGFUSE_BASE_URL: z.string().url().default("https://cloud.langfuse.com"),
    GITLAB_TOKEN: z.string().min(1),
    GITLAB_WEBHOOK_SECRET: z.string().min(1),
    GITLAB_BASE_URL: z.string().url().default("https://gitlab.com"),
    PLATFORM_ADMIN_ROLE: z.string().default("admin"),
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
  },
  skipValidation: process.env.NODE_ENV === "test",
});
