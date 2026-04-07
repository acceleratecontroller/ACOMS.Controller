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
        cache: "no-store",
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

  try {
    const url = `${baseUrl}/api/employees/assignees`;
    console.log("[acoms-os] fetching:", url);
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    console.log("[acoms-os] response status:", res.status);
    console.log("[acoms-os] content-type:", res.headers.get("content-type"));
    if (!res.ok) {
      const text = await res.text();
      console.log("[acoms-os] error response:", text.slice(0, 200));
      return [];
    }
    const text = await res.text();
    console.log("[acoms-os] raw response:", text.slice(0, 300));
    const data = JSON.parse(text);
    console.log("[acoms-os] employees returned:", data.employees?.length ?? 0);
    return data.employees || [];
  } catch (err) {
    console.error("[acoms-os] fetch error:", err);
    return [];
  }
}
