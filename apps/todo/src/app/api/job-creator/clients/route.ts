// GET  /api/job-creator/clients — list clients from ACOMS.WIP
// POST /api/job-creator/clients — create a new client in ACOMS.WIP

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getWipClients, createWipClient } from "@/lib/acoms-wip";

export async function GET(request: NextRequest) {
  const { error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  const clients = await getWipClients(search);
  return NextResponse.json(clients);
}

export async function POST(request: NextRequest) {
  const { error: authErr } = await requireAuth();
  if (authErr) return authErr;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { error: "Client name is required" },
      { status: 400 },
    );
  }

  try {
    const client = await createWipClient({
      name,
      simproCustomerId:
        typeof body.simproCustomerId === "number"
          ? body.simproCustomerId
          : null,
      contactName:
        typeof body.contactName === "string" ? body.contactName : undefined,
      contactEmail:
        typeof body.contactEmail === "string" ? body.contactEmail : undefined,
      contactPhone:
        typeof body.contactPhone === "string" ? body.contactPhone : undefined,
    });
    return NextResponse.json(client, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create client" },
      { status: 500 },
    );
  }
}
