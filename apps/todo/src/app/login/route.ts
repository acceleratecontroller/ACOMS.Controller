import { signIn } from "@/lib/auth";

export async function GET() {
  return signIn("acoms-auth", { redirectTo: "/" });
}
