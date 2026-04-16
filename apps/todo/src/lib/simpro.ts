/**
 * SimPRO integration — creates service jobs in SimPRO on approval.
 *
 * Required env vars:
 *   SIMPRO_BASE_URL      — e.g. https://acccom.simprosuite.com
 *   SIMPRO_CLIENT_ID     — OAuth2 client ID
 *   SIMPRO_CLIENT_SECRET — OAuth2 client secret
 *
 * Auth: OAuth2 client credentials grant (Basic auth header on token endpoint)
 * Company ID: 0 (all endpoints nested under /api/v1.0/companies/0/)
 */

const COMPANY_ID = 0;

function getBaseUrl(): string {
  const url = process.env.SIMPRO_BASE_URL;
  if (!url) throw new Error("SIMPRO_BASE_URL not configured");
  return url.replace(/\/$/, "");
}

function getClientId(): string {
  const id = process.env.SIMPRO_CLIENT_ID;
  if (!id) throw new Error("SIMPRO_CLIENT_ID not configured");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.SIMPRO_CLIENT_SECRET;
  if (!secret) throw new Error("SIMPRO_CLIENT_SECRET not configured");
  return secret;
}

// ─── OAuth2 Token Management ──────────────────────────────

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.accessToken;
  }

  const baseUrl = getBaseUrl();
  const clientId = getClientId();
  const clientSecret = getClientSecret();

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${baseUrl}/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SimPRO OAuth2 token request failed: ${res.status} ${body}`);
  }

  const data = await res.json();
  const accessToken = data.access_token;
  const expiresIn = data.expires_in || 3600; // default 1 hour

  cachedToken = {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  console.log("[simpro] Obtained OAuth2 access token");
  return accessToken;
}

// ─── API Helpers ──────────────────────────────────────────

async function simproFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = await getAccessToken();
  const baseUrl = getBaseUrl();

  return fetch(`${baseUrl}/api/v1.0/companies/${COMPANY_ID}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    },
  });
}

// ─── Cost Centres (Departments) ───────────────────────────

// Depot → SimPRO cost centre (internally "department") ID.
// Mackay = NQ (2). Brisbane / Hervey Bay / Bundaberg = SEQ (4).
const SIMPRO_COST_CENTRE_BY_DEPOT: Record<string, number> = {
  MACKAY: 2,
  BRISBANE: 4,
  HERVEY_BAY: 4,
  BUNDABERG: 4,
};

export function simProCostCentreForDepot(depot: string): number {
  const id = SIMPRO_COST_CENTRE_BY_DEPOT[depot];
  if (!id) {
    throw new Error(`No SimPRO cost centre mapped for depot "${depot}"`);
  }
  return id;
}

// ─── Service Jobs ─────────────────────────────────────────

export interface SimProJobInput {
  customerId: number;          // SimPRO customer ID (from client record)
  siteName: string;            // Project name / address
  description: string;         // Job description (email content)
  orderNo?: string;            // Client reference / PO number
  costCenterId: number;        // SimPRO cost centre / department ID
}

export interface SimProJobResult {
  jobId: number;
  jobUrl: string;
}

/**
 * Create a service job in SimPRO.
 */
export async function createSimProJob(input: SimProJobInput): Promise<SimProJobResult> {
  const jobBody = {
    Customer: input.customerId,
    Site: {
      Name: input.siteName,
    },
    Type: "Service",
    Description: input.description || "",
    OrderNo: input.orderNo || "",
    Stage: "Pending",
    CostCenter: input.costCenterId,
  };

  console.log(`[simpro] Creating service job for customer ${input.customerId} (costCenter=${input.costCenterId})`);

  const res = await simproFetch("/jobs/", {
    method: "POST",
    body: JSON.stringify(jobBody),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create SimPRO job: ${res.status} ${body}`);
  }

  const data = await res.json();
  const jobId = data.ID;
  const baseUrl = getBaseUrl();

  console.log(`[simpro] Created service job (ID: ${jobId})`);

  return {
    jobId,
    jobUrl: `${baseUrl}/companies/${COMPANY_ID}/jobs/${jobId}`,
  };
}

// ─── Quotes ───────────────────────────────────────────────

export interface SimProQuoteInput {
  customerId: number;          // SimPRO customer ID (from client record)
  siteName: string;            // Project name / address
  description: string;         // Job description (email content)
  dueDate?: string;            // Quote submission due date (YYYY-MM-DD)
  costCenterId: number;        // SimPRO cost centre / department ID
}

export interface SimProQuoteResult {
  quoteId: number;
  quoteUrl: string;
}

/**
 * Create a quote in SimPRO.
 */
export async function createSimProQuote(input: SimProQuoteInput): Promise<SimProQuoteResult> {
  const quoteBody: Record<string, unknown> = {
    Customer: input.customerId,
    Site: {
      Name: input.siteName,
    },
    Type: "Service",
    Description: input.description || "",
    Stage: "InProgress",
    CostCenter: input.costCenterId,
  };
  if (input.dueDate) quoteBody.DueDate = input.dueDate;

  console.log(`[simpro] Creating quote for customer ${input.customerId} (costCenter=${input.costCenterId})`);

  const res = await simproFetch("/quotes/", {
    method: "POST",
    body: JSON.stringify(quoteBody),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create SimPRO quote: ${res.status} ${body}`);
  }

  const data = await res.json();
  const quoteId = data.ID;
  const baseUrl = getBaseUrl();

  console.log(`[simpro] Created quote (ID: ${quoteId})`);

  return {
    quoteId,
    quoteUrl: `${baseUrl}/companies/${COMPANY_ID}/quotes/${quoteId}`,
  };
}
