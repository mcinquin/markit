import { NextResponse } from "next/server";
import { requireApiAccountReady } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createTeamSchema } from "@/lib/schemas/team";
import { parseJsonBody } from "@/lib/schemas/parse";

export async function GET() {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  const teams = await prisma.team.findMany({
    where: { members: { some: { userId: auth.session.user.id } } },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
      _count: { select: { cards: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(teams);
}

export async function POST(req: Request) {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(req, createTeamSchema);
  if (!parsed.ok) return parsed.response;

  const team = await prisma.team.create({
    data: {
      name: parsed.data.name,
      members: {
        create: { userId: auth.session.user.id, role: "OWNER" },
      },
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
    },
  });

  return NextResponse.json(team, { status: 201 });
}
