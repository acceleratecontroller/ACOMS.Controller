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
 * Require an authenticated session. Returns 401 if not authenticated.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    const { NextResponse } = await import("next/server");
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  return { session } as const;
}

/**
 * Require an authenticated ADMIN session.
 */
export async function requireAdmin() {
  const session = await auth();
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
