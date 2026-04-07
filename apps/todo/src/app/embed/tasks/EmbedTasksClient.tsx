"use client";

import { EmbedAuthProvider } from "@/components/EmbedAuthProvider";
import type { EmbedUser } from "@/components/EmbedAuthProvider";
import TaskManagerPage from "@/app/tasks/page";

export function EmbedTasksClient({
  token,
  user,
}: {
  token: string;
  user: EmbedUser;
}) {
  return (
    <EmbedAuthProvider token={token} user={user}>
      <div className="p-4 md:p-6">
        <TaskManagerPage />
      </div>
    </EmbedAuthProvider>
  );
}
