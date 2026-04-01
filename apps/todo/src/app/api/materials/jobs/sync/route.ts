// POST /api/materials/jobs/sync — refresh all WIP-linked jobs with latest data from WIP

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getWipProject } from "@/lib/acoms-wip";

export async function POST() {
  const { error: authErr } = await requireAuth();
  if (authErr) return authErr;

  // Find all jobs that are linked to WIP and not archived
  const linkedJobs = await prisma.job.findMany({
    where: {
      wipProjectId: { not: null },
      isArchived: false,
    },
    select: { id: true, wipProjectId: true },
  });

  if (linkedJobs.length === 0) {
    return NextResponse.json({ synced: 0 });
  }

  let synced = 0;

  // Fetch and update each linked job from WIP
  await Promise.all(
    linkedJobs.map(async (job) => {
      if (!job.wipProjectId) return;

      const wipProject = await getWipProject(job.wipProjectId);
      if (!wipProject) return;

      await prisma.job.update({
        where: { id: job.id },
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
      synced++;
    }),
  );

  return NextResponse.json({ synced });
}
