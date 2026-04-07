// src/lib/auth.ts — OIDC provider pointing to ACOMS.Auth

import NextAuth from "next-auth";
import type { OAuthConfig } from "next-auth/providers";
import "./auth-types";

interface AcomsAuthProfile {
  sub: string;
  email: string;
  name: string;
  role: string;
}

const AcomsAuthProvider: OAuthConfig<AcomsAuthProfile> = {
  id: "acoms-auth",
  name: "ACOMS.Auth",
  type: "oidc",
  issuer: process.env.ACOMS_AUTH_URL,
  wellKnown: `${process.env.ACOMS_AUTH_URL}/.well-known/openid-configuration`,
  clientId: process.env.ACOMS_AUTH_CLIENT_ID!,
  clientSecret: process.env.ACOMS_AUTH_CLIENT_SECRET!,
  authorization: {
    url: `${process.env.ACOMS_AUTH_URL}/oauth/authorize`,
    params: { scope: "openid profile email roles" },
  },
  token: `${process.env.ACOMS_AUTH_URL}/api/oauth/token`,
  userinfo: `${process.env.ACOMS_AUTH_URL}/api/oauth/userinfo`,
  checks: ["none"],
  profile(profile) {
    return {
      id: profile.sub,
      email: profile.email,
      name: profile.name,
      role: profile.role,
    };
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [AcomsAuthProvider],
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        token.role = profile.role as string;
        token.identityId = profile.sub as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.identityId as string;
        session.user.role = token.role as string;
        session.user.identityId = token.identityId as string;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
});

export type SessionUser = {
  id: string;
  role: string;
  identityId: string;
  email?: string;
  name?: string;
};

export type Session = {
  user: SessionUser;
};

/**
 * Try embed token auth first (via headers()), then fall back to session cookie.
 * Uses Next.js headers() so no API route changes are needed.
 */
async function resolveSession(): Promise<Session | null> {
  const { headers } = await import("next/headers");
  const headerStore = await headers();
  const authHeader = headerStore.get("authorization");

  if (authHeader?.startsWith("Bearer embed:")) {
    const { validateEmbedToken } = await import("./embed-token");
    const user = validateEmbedToken(authHeader.slice("Bearer embed:".length));
    if (user) return { user };
  }

  // Fall back to NextAuth session cookie
  const session = await auth();
  if (!session?.user) return null;
  return session as Session;
}

/**
 * Require an authenticated session. Returns 401 if not authenticated.
 * Automatically checks embed tokens via request headers — no changes needed in API routes.
 */
export async function requireAuth() {
  const session = await resolveSession();
  if (!session?.user) {
    const { NextResponse } = await import("next/server");
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  return { session } as const;
}

/**
 * Require an authenticated ADMIN session.
 * Automatically checks embed tokens via request headers.
 */
export async function requireAdmin() {
  const session = await resolveSession();
  if (!session?.user) {
    const { NextResponse } = await import("next/server");
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  if (session.user.role !== "ADMIN") {
    const { NextResponse } = await import("next/server");
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }
  return { session } as const;
}
