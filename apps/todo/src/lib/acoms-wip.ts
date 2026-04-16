// src/lib/acoms-wip.ts — ACOMS.WIP API client for project/job data

const getBaseUrl = () => process.env.ACOMS_WIP_API_URL || "";
const getToken = () => process.env.ACOMS_WIP_SERVICE_TOKEN || "";

function wipHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  };
}

// ─── Projects ──────────────────────────────────────────────

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

// ─── Clients ───────────────────────────────────────────────

export interface WipContract {
  id: string;
  name: string;
  contractNumber: string | null;
}

export interface WipClient {
  id: string;
  name: string;
  simproCustomerId: number | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contracts: WipContract[];
}

/**
 * Fetch clients from ACOMS.WIP with optional search filter.
 */
export async function getWipClients(search?: string): Promise<WipClient[]> {
  try {
    const url = new URL(`${getBaseUrl()}/api/external/clients`);
    if (search) url.searchParams.set("search", search);

    const res = await fetch(url.toString(), {
      headers: wipHeaders(),
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

/**
 * Create a new client in ACOMS.WIP.
 */
export async function createWipClient(data: {
  name: string;
  simproCustomerId?: number | null;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  abn?: string;
  address?: string;
  skipSimPro?: boolean;
  privateClient?: boolean;
}): Promise<WipClient> {
  const res = await fetch(`${getBaseUrl()}/api/external/clients`, {
    method: "POST",
    headers: wipHeaders(),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `Failed to create client: ${res.status}`);
  }

  return res.json();
}
