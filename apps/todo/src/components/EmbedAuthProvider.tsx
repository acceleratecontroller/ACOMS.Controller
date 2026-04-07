"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";

export interface EmbedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  identityId: string;
}

interface EmbedAuthContextValue {
  token: string | null;
  user: EmbedUser | null;
  isEmbed: boolean;
}

const EmbedAuthContext = createContext<EmbedAuthContextValue>({
  token: null,
  user: null,
  isEmbed: false,
});

export function useEmbedAuth() {
  return useContext(EmbedAuthContext);
}

/**
 * Wraps embed pages to intercept fetch calls and inject the embed token
 * as an Authorization header. This allows existing client components
 * (TaskManagerPage, DashboardPage) to work without modification.
 *
 * Also intercepts /api/auth/session calls to return the embed user
 * since NextAuth session cookies aren't available in cross-origin iframes.
 */
export function EmbedAuthProvider({
  token,
  user,
  children,
}: {
  token: string;
  user: EmbedUser;
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const originalFetch = useRef<typeof globalThis.fetch | null>(null);

  useEffect(() => {
    if (!originalFetch.current) {
      originalFetch.current = globalThis.fetch.bind(globalThis);
    }
    const nativeFetch = originalFetch.current;

    globalThis.fetch = async (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : (input as Request).url;

      // Intercept NextAuth session endpoint — return embed user as session
      if (url === "/api/auth/session" || url.startsWith("/api/auth/session?")) {
        return new Response(
          JSON.stringify({ user: { ...user, id: user.identityId } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      // Add embed token to all other API calls
      if (url.startsWith("/api/")) {
        const headers = new Headers(init?.headers);
        headers.set("Authorization", `Bearer embed:${token}`);
        return nativeFetch(input, { ...init, headers });
      }

      return nativeFetch(input, init);
    };

    setReady(true);

    return () => {
      if (originalFetch.current) {
        globalThis.fetch = originalFetch.current;
      }
    };
  }, [token, user]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <EmbedAuthContext.Provider value={{ token, user, isEmbed: true }}>
      {children}
    </EmbedAuthContext.Provider>
  );
}
