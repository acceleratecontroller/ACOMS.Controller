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
  try {
    const res = await fetch(`${getBaseUrl()}/api/employees/assignees`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.employees || [];
  } catch {
    return [];
  }
}
