// src/lib/embed-token.ts — Validates embed tokens from ACOMS.OS
// ACOMS.OS generates short-lived signed tokens containing user identity.
// This module verifies those tokens so embed routes can authenticate
// without relying on session cookies (which are blocked cross-origin).

import { createHmac, timingSafeEqual } from "crypto";

export interface EmbedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  identityId: string;
}

interface EmbedTokenPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  identityId: string;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.ACOMS_OS_SERVICE_TOKEN;
  if (!secret) throw new Error("ACOMS_OS_SERVICE_TOKEN is not configured");
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

/**
 * Validate an embed token and return the user identity.
 * Returns null if the token is invalid or expired.
 */
export function validateEmbedToken(token: string): EmbedUser | null {
  try {
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) return null;

    // Verify signature using timing-safe comparison
    const expectedSig = sign(encodedPayload);
    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSig, "hex");
    if (sigBuffer.length !== expectedBuffer.length) return null;
    if (!timingSafeEqual(sigBuffer, expectedBuffer)) return null;

    // Decode and parse payload
    const payload: EmbedTokenPayload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf-8")
    );

    // Check expiry
    if (Date.now() > payload.exp) return null;

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      identityId: payload.identityId,
    };
  } catch {
    return null;
  }
}

/**
 * Extract embed token from a request.
 * Checks query param `token` first, then Authorization: Bearer header.
 */
export function extractEmbedToken(request: Request): string | null {
  // Check Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer embed:")) {
    return authHeader.slice("Bearer embed:".length);
  }

  // Check URL query param
  const url = new URL(request.url);
  return url.searchParams.get("token");
}
