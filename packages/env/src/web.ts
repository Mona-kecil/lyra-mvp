import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_CONVEX_URL: z.string(),
    VITE_CONVEX_SITE_URL: z.string(),
  },
  runtimeEnv: (import.meta as any).env,
  emptyStringAsUndefined: true,
});
