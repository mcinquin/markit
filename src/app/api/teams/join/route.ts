import { NextResponse } from "next/server";
import { requireApiAccountReady } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { joinTeamSchema } from "@/lib/schemas/team";
import { parseJsonBody } from "@/lib/schemas/parse";

export async function POST(req: Request) {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(req, joinTeamSchema);
  if (!parsed.ok) return parsed.response;

  const team = await prisma.team.findUnique({ where: { inviteCode: parsed.data.inviteCode } });
  if (!team) return NextResponse.json({ error: "Code invalide" }, { status: 404 });

  const existing = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId: auth.session.user.id, teamId: team.id } },
  });
  if (existing) return NextResponse.json({ error: "Tu es déjà membre de cette équipe" }, { status: 409 });

  await prisma.teamMember.create({
    data: { userId: auth.session.user.id, teamId: team.id, role: "MEMBER" },
  });

  return NextResponse.json({ teamId: team.id, teamName: team.name });
}
