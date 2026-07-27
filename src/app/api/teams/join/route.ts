import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { inviteCode } = await req.json();
  if (!inviteCode) return NextResponse.json({ error: "Code requis" }, { status: 400 });

  const team = await prisma.team.findUnique({ where: { inviteCode } });
  if (!team) return NextResponse.json({ error: "Code invalide" }, { status: 404 });

  const existing = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId: team.id } },
  });
  if (existing) return NextResponse.json({ error: "Tu es déjà membre de cette équipe" }, { status: 409 });

  await prisma.teamMember.create({
    data: { userId: session.user.id, teamId: team.id, role: "MEMBER" },
  });

  return NextResponse.json({ teamId: team.id, teamName: team.name });
}
