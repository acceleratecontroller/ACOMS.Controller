/**
 * One-time migration script: Link existing Controller jobs to ACOMS.WIP projects.
 *
 * Matches by projectId (e.g. "A0023") against WIP acomsNumberFormatted.
 *
 * Usage:
 *   npx tsx scripts/migrate-jobs-to-wip.ts
 *
 * Set these env vars (or have them in .env):
 *   ACOMS_WIP_API_URL
 *   ACOMS_WIP_SERVICE_TOKEN
 *   DATABASE_URL
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const WIP_API_URL = process.env.ACOMS_WIP_API_URL || "";
const WIP_TOKEN = process.env.ACOMS_WIP_SERVICE_TOKEN || "";

interface WipProject {
  id: string;
  acomsNumber: number;
  acomsNumberFormatted: string;
  name: string;
  stage: string;
  clientName: string | null;
  depotName: string | null;
  contactName: string | null;
  siteAddress: string | null;
}

async function fetchAllWipProjects(): Promise<WipProject[]> {
  const res = await fetch(`${WIP_API_URL}/api/external/projects`, {
    headers: { Authorization: `Bearer ${WIP_TOKEN}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch WIP projects: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function main() {
  console.log("Fetching all WIP projects...");
  const wipProjects = await fetchAllWipProjects();
  console.log(`Found ${wipProjects.length} active WIP projects.`);

  // Build lookup by formatted ACOMS number
  const wipByAcoms = new Map<string, WipProject>();
  for (const wp of wipProjects) {
    wipByAcoms.set(wp.acomsNumberFormatted, wp);
  }

  // Fetch all Controller jobs without a WIP link
  const jobs = await prisma.job.findMany({
    where: { wipProjectId: null },
    select: { id: true, projectId: true, name: true },
  });

  console.log(`Found ${jobs.length} unlinked Controller jobs.`);
  console.log("");

  let matched = 0;
  let unmatched = 0;

  for (const job of jobs) {
    const wipProject = wipByAcoms.get(job.projectId);

    if (wipProject) {
      console.log(`  MATCH: "${job.projectId}" (${job.name}) -> WIP ${wipProject.acomsNumberFormatted} (${wipProject.name})`);

      await prisma.job.update({
        where: { id: job.id },
        data: {
          wipProjectId: wipProject.id,
          name: wipProject.name,
          client: wipProject.clientName || "Unknown",
          contact: wipProject.contactName || "",
          stage: wipProject.stage,
          siteAddress: wipProject.siteAddress,
          depotName: wipProject.depotName,
          wipSyncedAt: new Date(),
        },
      });
      matched++;
    } else {
      console.log(`  NO MATCH: "${job.projectId}" (${job.name}) — no WIP project found`);
      unmatched++;
    }
  }

  console.log("");
  console.log(`Done. Matched: ${matched}, Unmatched: ${unmatched}`);

  if (unmatched > 0) {
    console.log("Review unmatched jobs manually — they may have different project IDs in WIP.");
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
