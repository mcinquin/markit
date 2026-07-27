import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_TEAM_NAME_LENGTH = 100;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const teams = await prisma.team.findMany({
    where: { members: { some: { userId: session.user.id } } },
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
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  if (name.length > MAX_TEAM_NAME_LENGTH) {
    return NextResponse.json({ error: `Nom trop long (max ${MAX_TEAM_NAME_LENGTH} caractères)` }, { status: 400 });
  }

  const team = await prisma.team.create({
    data: {
      name,
      members: {
        create: { userId: session.user.id, role: "OWNER" },
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
