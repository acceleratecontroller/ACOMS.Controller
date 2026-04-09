"use client";

import { EmbedAuthProvider } from "@/components/EmbedAuthProvider";
import type { EmbedUser } from "@/components/EmbedAuthProvider";
import DiaryPage from "@/app/diary/page";

export function EmbedDiaryClient({
  token,
  user,
}: {
  token: string;
  user: EmbedUser;
}) {
  return (
    <EmbedAuthProvider token={token} user={user}>
      <div className="p-4 md:p-6">
        <DiaryPage />
      </div>
    </EmbedAuthProvider>
  );
}
