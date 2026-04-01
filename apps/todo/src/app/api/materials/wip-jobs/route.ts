// GET  /api/materials/wip-jobs        — list available WIP projects (excludes already-linked)
// POST /api/materials/wip-jobs        — link a WIP project as a local Job

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getWipProjects, getWipProject } from "@/lib/acoms-wip";

export async function GET(request: NextRequest) {
  const { error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  // Fetch projects from WIP
  const wipProjects = await getWipProjects(search);

  // Get already-linked WIP project IDs so we can exclude them
  const linkedJobs = await prisma.job.findMany({
    where: { wipProjectId: { not: null } },
    select: { wipProjectId: true },
  });
  const linkedIds = new Set(linkedJobs.map((j) => j.wipProjectId));

  // Filter out already-linked projects
  const available = wipProjects.filter((p) => !linkedIds.has(p.id));

  return NextResponse.json(available);
}

export async function POST(request: NextRequest) {
  const { session, error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  try {
    const body = await request.json();
    const wipProjectId = body.wipProjectId;

    if (!wipProjectId) {
      return NextResponse.json({ error: "wipProjectId is required" }, { status: 400 });
    }

    // Check not already linked
    const existing = await prisma.job.findUnique({ where: { wipProjectId } });
    if (existing) {
      return NextResponse.json(
        { error: "This WIP project is already linked to a job" },
        { status: 409 },
      );
    }

    // Fetch full project details from WIP
    const wipProject = await getWipProject(wipProjectId);
    if (!wipProject) {
      return NextResponse.json({ error: "WIP project not found" }, { status: 404 });
    }

    // Create local Job record populated from WIP data
    const job = await prisma.job.create({
      data: {
        projectId: wipProject.acomsNumberFormatted,
        name: wipProject.name,
        client: wipProject.clientName || "Unknown",
        contact: wipProject.contactName || "",
        wipProjectId: wipProject.id,
        stage: wipProject.stage,
        siteAddress: wipProject.siteAddress,
        depotName: wipProject.depotName,
        wipSyncedAt: new Date(),
        createdById: session.user.id,
      },
    });

    audit({
      entityType: "Job",
      entityId: job.id,
      action: "CREATE",
      entityLabel: `${job.projectId} — ${job.name} (linked from WIP)`,
      performedById: session.user.id,
    });

    return NextResponse.json(job, { status: 201 });
  } catch (err) {
    console.error("POST /api/materials/wip-jobs error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to link WIP job" },
      { status: 500 },
    );
  }
}
