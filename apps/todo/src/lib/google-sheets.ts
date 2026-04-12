/**
 * Google Sheets integration — pushes approved job requests to the WIP sheet.
 *
 * Required env vars:
 *   GOOGLE_SHEETS_CLIENT_EMAIL  — service account email
 *   GOOGLE_SHEETS_PRIVATE_KEY   — service account private key (PEM)
 *   GOOGLE_SHEETS_SPREADSHEET_ID — the target spreadsheet ID
 */

import { google } from "googleapis";

const SHEET_NAME = "Data";

// Column mapping (A=0, B=1, ... K=10):
//   A: Depot
//   B: Client
//   C: Contract
//   D: Initial Status
//   E: Acoms Number  ← SKIP (pre-filled)
//   F: Finance/PO Number/s
//   G: Client Reference Number
//   H: Project Name/Address
//   I: Job Received Date
//   J: Client Contact
//   K: Job Creation and Review

interface JobSheetRow {
  depot: string;
  client: string;
  contract: string;
  initialStatus: string;
  financePONumber: string;
  clientReference: string;
  projectNameAddress: string;
  jobReceivedDate: string;
  clientContact: string;
  jobCreationAndReview: string;
}

function getAuth() {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error("Google Sheets credentials not configured");
  }

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      // Vercel stores \n as literal backslash-n — restore actual newlines
      private_key: privateKey.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

/**
 * Find the first empty row in the Data sheet by checking column A.
 * Returns the 1-based row number.
 */
async function findNextEmptyRow(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
): Promise<number> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A:A`,
  });

  const values = res.data.values || [];
  // Row 1 is the header, so next empty row is values.length + 1
  // But if there are gaps, find the first empty cell after the header
  for (let i = 1; i < values.length; i++) {
    if (!values[i] || !values[i][0] || String(values[i][0]).trim() === "") {
      return i + 1; // 1-based row number
    }
  }
  return values.length + 1;
}

/**
 * Push an approved job request to the WIP Google Sheet.
 * Writes to columns A–D and F–K, skipping column E (pre-filled Acoms Number).
 */
export async function pushJobToSheet(row: JobSheetRow): Promise<{ row: number; acomsNumber: string | null }> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID not configured");
  }

  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const targetRow = await findNextEmptyRow(sheets, spreadsheetId);

  // Write columns A–D (Depot, Client, Contract, Initial Status)
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_NAME}!A${targetRow}:D${targetRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        row.depot,
        row.client,
        row.contract,
        row.initialStatus,
      ]],
    },
  });

  // Write columns F–K (skip E — pre-filled Acoms Number)
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_NAME}!F${targetRow}:K${targetRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        row.financePONumber,
        row.clientReference,
        row.projectNameAddress,
        row.jobReceivedDate,
        row.clientContact,
        row.jobCreationAndReview,
      ]],
    },
  });

  // Read back column E to get the pre-filled Acoms Number
  const acomsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!E${targetRow}`,
  });

  const acomsNumber = acomsRes.data.values?.[0]?.[0]
    ? String(acomsRes.data.values[0][0])
    : null;

  return { row: targetRow, acomsNumber };
}
