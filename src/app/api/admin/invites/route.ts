import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

const INVITE_VALIDITY_DAYS = 7;
const MAX_NOTE_LENGTH = 100;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!(await isAdmin(session.user.id))) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const invites = await prisma.inviteToken.findMany({
    orderBy: { expiresAt: "desc" },
    include: { createdBy: { select: { name: true, email: true } } },
  });

  return NextResponse.json(invites);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!(await isAdmin(session.user.id))) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json();
  const note = typeof body.note === "string" ? body.note.trim().slice(0, MAX_NOTE_LENGTH) : null;
  const validityDays = Number(body.validityDays) || INVITE_VALIDITY_DAYS;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + Math.min(Math.max(validityDays, 1), 30));

  const invite = await prisma.inviteToken.create({
    data: {
      note,
      createdById: session.user.id,
      expiresAt,
    },
  });

  return NextResponse.json(invite, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!(await isAdmin(session.user.id))) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await req.json();
  if (!id || typeof id !== "string") return NextResponse.json({ error: "ID requis" }, { status: 400 });

  await prisma.inviteToken.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
