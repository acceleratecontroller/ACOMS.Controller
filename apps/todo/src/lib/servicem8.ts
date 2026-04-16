/**
 * ServiceM8 integration — creates jobs in ServiceM8 on approval.
 *
 * Required env var:
 *   SERVICEM8_API_KEY — the smk-* API key
 */

const BASE_URL = "https://api.servicem8.com/api_1.0";

function getApiKey(): string {
  const key = process.env.SERVICEM8_API_KEY;
  if (!key) throw new Error("SERVICEM8_API_KEY not configured");
  return key;
}

async function sm8Fetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "X-API-Key": getApiKey(),
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  return res;
}

// ─── Categories ─────────────────────────────────────────

interface SM8Category {
  uuid: string;
  name: string;
  active: number;
}

async function listCategories(): Promise<SM8Category[]> {
  const res = await sm8Fetch("/category.json");
  if (!res.ok) throw new Error(`Failed to list categories: ${res.status}`);
  return res.json();
}

async function findOrCreateCategory(name: string): Promise<string> {
  const categories = await listCategories();

  // Try exact match first (active or inactive)
  const existing = categories.find(
    (c) => c.name.toLowerCase() === name.toLowerCase(),
  );
  if (existing) {
    console.log(`[servicem8] Found existing category "${existing.name}" (uuid: ${existing.uuid}, active: ${existing.active})`);
    // Reactivate if inactive
    if (existing.active === 0) {
      await sm8Fetch(`/category/${existing.uuid}.json`, {
        method: "POST",
        body: JSON.stringify({ active: 1 }),
      });
    }
    return existing.uuid;
  }

  // Create new category
  console.log(`[servicem8] Creating new category: "${name}"`);
  const res = await sm8Fetch("/category.json", {
    method: "POST",
    body: JSON.stringify({ name, active: 1 }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create category "${name}": ${res.status} ${body}`);
  }

  const uuid = res.headers.get("x-record-uuid");
  if (!uuid) throw new Error("ServiceM8 did not return category UUID");
  console.log(`[servicem8] Created category "${name}" (uuid: ${uuid})`);
  return uuid;
}

// ─── Companies ──────────────────────────────────────────

async function createCompany(name: string): Promise<string> {
  const res = await sm8Fetch("/company.json", {
    method: "POST",
    body: JSON.stringify({ name, active: 1 }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create company: ${res.status} ${body}`);
  }

  const uuid = res.headers.get("x-record-uuid");
  if (!uuid) throw new Error("ServiceM8 did not return company UUID");
  console.log(`[servicem8] Created company "${name}" (uuid: ${uuid})`);
  return uuid;
}

// ─── Jobs ───────────────────────────────────────────────

export interface SM8JobInput {
  companyName: string;       // "{Client Ref} - {Project Name/Address}" for WO, Project Name for Quote
  jobAddress: string;        // Project Name/Address
  categoryName: string;      // "{Client} - {Contract}"
  purchaseOrderNumber: string; // Client name
  jobDescription: string;    // Email content
  status?: "Work Order" | "Quote"; // ServiceM8 job status, defaults to "Work Order"
}

export interface SM8JobResult {
  jobUuid: string;
  categoryUuid: string;
  companyUuid: string;
}

export async function createServiceM8Job(input: SM8JobInput): Promise<SM8JobResult> {
  // 1. Find or create category
  const categoryUuid = await findOrCreateCategory(input.categoryName);

  // 2. Create company record for the "company name" display
  const companyUuid = await createCompany(input.companyName);

  // 3. Create the job
  const jobBody = {
    status: input.status || "Work Order",
    job_address: input.jobAddress,
    billing_address: input.jobAddress,
    company_uuid: companyUuid,
    category_uuid: categoryUuid,
    purchase_order_number: input.purchaseOrderNumber,
    job_description: input.jobDescription || "",
  };

  console.log(`[servicem8] Creating job with category_uuid: ${categoryUuid}, company_uuid: ${companyUuid}`);

  const res = await sm8Fetch("/job.json", {
    method: "POST",
    body: JSON.stringify(jobBody),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create ServiceM8 job: ${res.status} ${body}`);
  }

  const jobUuid = res.headers.get("x-record-uuid");
  if (!jobUuid) throw new Error("ServiceM8 did not return job UUID");
  console.log(`[servicem8] Created job (uuid: ${jobUuid})`);

  return {
    jobUuid,
    categoryUuid,
    companyUuid,
  };
}
