import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { count, eq } from "drizzle-orm";
import { authDb } from "@/lib/auth/db";
import {
  ADMIN_GRADE,
  ADMIN_ROLE,
  DEFAULT_USER_GRADE,
  DEFAULT_USER_ROLE,
} from "@/lib/auth/permissions";
import * as schema from "@/lib/auth/schema";

function normalizeOrigin(value: string) {
  try {
    const url = new URL(value.trim());
    return url.origin;
  } catch {
    return null;
  }
}

function parseOrigins(value: string | undefined) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => normalizeOrigin(item))
    .filter((item): item is string => Boolean(item));
}

const explicitBaseUrl = normalizeOrigin(process.env.BETTER_AUTH_URL || "");
const extraTrustedOrigins = parseOrigins(process.env.BETTER_AUTH_TRUSTED_ORIGINS);

const authBaseUrl = explicitBaseUrl || "http://localhost:9002";
const trustedOrigins = Array.from(new Set([authBaseUrl, ...extraTrustedOrigins]));

const authSecret = process.env.BETTER_AUTH_SECRET || "change-this-secret-in-production";

export const auth = betterAuth({
  baseURL: authBaseUrl,
  trustedOrigins,
  secret: authSecret,
  database: drizzleAdapter(authDb, {
    provider: "sqlite",
    schema,
  }),
  plugins: [nextCookies()],
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        input: false,
        defaultValue: DEFAULT_USER_ROLE,
      },
      grade: {
        type: "number",
        required: false,
        input: false,
        defaultValue: DEFAULT_USER_GRADE,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          const row = authDb.select({ total: count() }).from(schema.user).get();
          const total = Number(row?.total ?? 0);

          if (total !== 1) return;

          authDb
            .update(schema.user)
            .set({
              role: ADMIN_ROLE,
              grade: ADMIN_GRADE,
              updatedAt: new Date(),
            })
            .where(eq(schema.user.id, createdUser.id))
            .run();
        },
      },
    },
  },
});
