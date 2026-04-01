// POST /api/materials/jobs/:id/sync — refresh a single job from WIP

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getWipProject } from "@/lib/acoms-wip";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: { id },
    select: { wipProjectId: true },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (!job.wipProjectId) {
    return NextResponse.json({ synced: false, reason: "Not linked to WIP" });
  }

  const wipProject = await getWipProject(job.wipProjectId);
  if (!wipProject) {
    return NextResponse.json({ synced: false, reason: "WIP project not found" });
  }

  await prisma.job.update({
    where: { id },
    data: {
      projectId: wipProject.acomsNumberFormatted,
      name: wipProject.name,
      client: wipProject.clientName || "Unknown",
      contact: wipProject.contactName || "",
      stage: wipProject.stage,
      siteAddress: wipProject.siteAddress,
      depotName: wipProject.depotName,
      wipSyncedAt: new Date(),
    },
  });

  return NextResponse.json({ synced: true });
}
