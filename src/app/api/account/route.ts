import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAccountProfile, updateAccount } from "@/lib/account";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const profile = await getAccountProfile(session.user.id);
  if (!profile) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }

  return NextResponse.json(profile);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const result = await updateAccount(session.user.id, {
    name: body.name,
    currentPassword: body.currentPassword,
    newPassword: body.newPassword,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.profile);
}
