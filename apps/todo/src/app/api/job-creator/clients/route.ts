// GET  /api/job-creator/clients — list clients from ACOMS.WIP
// POST /api/job-creator/clients — create a new client in ACOMS.WIP

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getWipClients, createWipClient } from "@/lib/acoms-wip";

export async function GET(request: NextRequest) {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  const clients = await getWipClients(search);
  return NextResponse.json(clients);
}

export async function POST(request: NextRequest) {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const abn = typeof body.abn === "string" ? body.abn.trim() : "";
  const contactPhone =
    typeof body.contactPhone === "string" ? body.contactPhone.trim() : "";
  const contactEmail =
    typeof body.contactEmail === "string" ? body.contactEmail.trim() : "";
  const address = typeof body.address === "string" ? body.address.trim() : "";

  const missing: string[] = [];
  if (!name) missing.push("name");
  if (!abn) missing.push("abn");
  if (!contactPhone) missing.push("phone");
  if (!contactEmail) missing.push("email");
  if (!address) missing.push("address");
  if (missing.length) {
    return NextResponse.json(
      { error: `Required field(s) missing: ${missing.join(", ")}` },
      { status: 400 },
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return NextResponse.json(
      { error: "Please enter a valid email address" },
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
      contactEmail,
      contactPhone,
      abn,
      address,
      skipSimPro: body.skipSimPro === true,
      privateClient: body.privateClient === true,
    });
    return NextResponse.json(client, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create client" },
      { status: 500 },
    );
  }
}
