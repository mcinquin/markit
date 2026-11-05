import { NextResponse } from "next/server";
import { requireApiAccountReady } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getUserTeams, teamMembersInclude } from "@/lib/data";
import { createTeamSchema } from "@/lib/schemas/team";
import { parseJsonBody } from "@/lib/schemas/parse";

export async function GET() {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  return NextResponse.json(await getUserTeams(auth.session.user.id));
}

export async function POST(req: Request) {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(req, createTeamSchema);
  if (!parsed.ok) return parsed.response;

  const team = await prisma.team.create({
    data: {
      name: parsed.data.name,
      createdById: auth.session.user.id,
      members: {
        create: { userId: auth.session.user.id, role: "OWNER" },
      },
    },
    include: teamMembersInclude,
  });

  return NextResponse.json(team, { status: 201 });
}
