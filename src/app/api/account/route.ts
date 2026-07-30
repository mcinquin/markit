import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { getAccountProfile, updateAccount } from "@/lib/account";
import { updateAccountSchema } from "@/lib/schemas/account";
import { parseJsonBody } from "@/lib/schemas/parse";

export async function GET() {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const profile = await getAccountProfile(auth.session.user.id);
  if (!profile) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }

  return NextResponse.json(profile);
}

export async function PATCH(req: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(req, updateAccountSchema);
  if (!parsed.ok) return parsed.response;

  const result = await updateAccount(auth.session.user.id, parsed.data);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.profile);
}
