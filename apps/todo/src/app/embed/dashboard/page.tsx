import { validateEmbedToken } from "@/lib/embed-token";
import { EmbedDashboardClient } from "./EmbedDashboardClient";

export default async function EmbedDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-red-600">
        Missing authentication token.
      </div>
    );
  }

  const user = validateEmbedToken(token);
  if (!user) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-red-600">
        Invalid or expired token. Please refresh the page.
      </div>
    );
  }

  return <EmbedDashboardClient token={token} user={user} />;
}
