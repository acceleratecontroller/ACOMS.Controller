import { redirect } from "next/navigation";
import { validateEmbedToken } from "@/lib/embed-token";
import { EmbedTasksClient } from "./EmbedTasksClient";

export default async function EmbedTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    return (
      <div className="flex items-center justify-center h-screen text-sm text-red-600">
        Missing authentication token.
      </div>
    );
  }

  const user = validateEmbedToken(token);
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen text-sm text-red-600">
        Invalid or expired token. Please refresh the page.
      </div>
    );
  }

  return <EmbedTasksClient token={token} user={user} />;
}
