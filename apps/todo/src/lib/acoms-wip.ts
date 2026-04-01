// src/lib/acoms-wip.ts — ACOMS.WIP API client for project/job data

const getBaseUrl = () => process.env.ACOMS_WIP_API_URL || "";
const getToken = () => process.env.ACOMS_WIP_SERVICE_TOKEN || "";

export interface WipProject {
  id: string;
  acomsNumber: number;
  acomsNumberFormatted: string;
  name: string;
  projectNumber: string | null;
  stage: string;
  siteAddress: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  depotId: string | null;
  depotName: string | null;
  clientId: string;
  clientName: string | null;
}

/**
 * Fetch active projects from ACOMS.WIP with optional search filter.
 */
export async function getWipProjects(search?: string): Promise<WipProject[]> {
  try {
    const url = new URL(`${getBaseUrl()}/api/external/projects`);
    if (search) url.searchParams.set("search", search);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${getToken()}` },
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

/**
 * Fetch a single project by ID from ACOMS.WIP.
 */
export async function getWipProject(id: string): Promise<WipProject | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/external/projects/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
