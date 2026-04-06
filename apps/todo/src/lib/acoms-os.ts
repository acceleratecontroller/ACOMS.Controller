// src/lib/acoms-os.ts — ACOMS.OS API client for employee data

const getBaseUrl = () => process.env.ACOMS_OS_API_URL || "";
const getToken = () => process.env.ACOMS_OS_SERVICE_TOKEN || "";

interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  location: string;
  status: string;
  identityId: string | null;
}

/**
 * Fetch a single employee by their Auth identity ID.
 */
export async function getEmployeeByIdentityId(identityId: string): Promise<Employee | null> {
  try {
    const res = await fetch(
      `${getBaseUrl()}/api/employees/lookup?identityId=${encodeURIComponent(identityId)}`,
      {
        headers: { Authorization: `Bearer ${getToken()}` },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Fetch list of active employees for assignee dropdowns.
 */
export async function getAssignableEmployees(): Promise<Employee[]> {
  const baseUrl = getBaseUrl();
  const token = getToken();
  console.log("[acoms-os] getAssignableEmployees called");
  console.log("[acoms-os] baseUrl:", baseUrl ? `${baseUrl.slice(0, 20)}...` : "EMPTY");
  console.log("[acoms-os] token present:", token.length > 0, "length:", token.length);

  try {
    const url = `${baseUrl}/api/employees/assignees`;
    console.log("[acoms-os] fetching:", url);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 60 },
    });
    console.log("[acoms-os] response status:", res.status);
    if (!res.ok) {
      const text = await res.text();
      console.log("[acoms-os] error response:", text);
      return [];
    }
    const data = await res.json();
    console.log("[acoms-os] employees returned:", data.employees?.length ?? 0);
    return data.employees || [];
  } catch (err) {
    console.error("[acoms-os] fetch error:", err);
    return [];
  }
}
