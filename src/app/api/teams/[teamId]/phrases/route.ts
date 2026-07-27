import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTeamMembership } from "@/lib/authz";

const MAX_PHRASE_LENGTH = 200;
const MAX_EMOJI_LENGTH = 4;

type RouteContext = { params: Promise<{ teamId: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { teamId } = await params;

  const membership = await getTeamMembership(session.user.id, teamId);
  if (!membership) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const [defaults, custom] = await Promise.all([
    prisma.phrase.findMany({ where: { isDefault: true }, orderBy: { text: "asc" } }),
    prisma.phrase.findMany({
      where: { teamId, isDefault: false },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ defaults, custom });
}

export async function POST(req: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { teamId } = await params;

  const membership = await getTeamMembership(session.user.id, teamId);
  if (!membership) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await req.json();
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const emoji = typeof body.emoji === "string" ? body.emoji.trim() : "";

  if (!text) return NextResponse.json({ error: "Texte requis" }, { status: 400 });
  if (text.length > MAX_PHRASE_LENGTH) {
    return NextResponse.json({ error: `Texte trop long (max ${MAX_PHRASE_LENGTH} caractères)` }, { status: 400 });
  }
  if (emoji && emoji.length > MAX_EMOJI_LENGTH) {
    return NextResponse.json({ error: "Emoji invalide" }, { status: 400 });
  }

  const phrase = await prisma.phrase.create({
    data: { text, emoji: emoji || null, teamId },
  });

  return NextResponse.json(phrase, { status: 201 });
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { teamId } = await params;

  const membership = await getTeamMembership(session.user.id, teamId);
  if (!membership) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await req.json();
  const { phraseId } = body;
  if (!phraseId || typeof phraseId !== "string") {
    return NextResponse.json({ error: "ID requis" }, { status: 400 });
  }

  const phrase = await prisma.phrase.findUnique({ where: { id: phraseId } });

  // Vérifie que la phrase appartient bien à cette équipe et n'est pas une phrase globale
  if (!phrase || phrase.isDefault || phrase.teamId !== teamId) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  await prisma.phrase.delete({ where: { id: phraseId } });
  return NextResponse.json({ ok: true });
}
