import { NextResponse } from "next/server";
import { requireApiAccountReady } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getTeamMembership } from "@/lib/authz";
import { createPhraseSchema, deletePhraseSchema } from "@/lib/schemas/phrase";
import { parseJsonBody } from "@/lib/schemas/parse";

type RouteContext = { params: Promise<{ teamId: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  const { teamId } = await params;

  const membership = await getTeamMembership(auth.session.user.id, teamId);
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
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  const { teamId } = await params;

  const membership = await getTeamMembership(auth.session.user.id, teamId);
  if (!membership) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const parsed = await parseJsonBody(req, createPhraseSchema);
  if (!parsed.ok) return parsed.response;

  const { text, emoji } = parsed.data;
  const phrase = await prisma.phrase.create({
    data: { text, emoji: emoji || null, teamId },
  });

  return NextResponse.json(phrase, { status: 201 });
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  const { teamId } = await params;

  const membership = await getTeamMembership(auth.session.user.id, teamId);
  if (!membership) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const parsed = await parseJsonBody(req, deletePhraseSchema);
  if (!parsed.ok) return parsed.response;

  const phrase = await prisma.phrase.findUnique({ where: { id: parsed.data.phraseId } });

  if (!phrase || phrase.isDefault || phrase.teamId !== teamId) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  await prisma.phrase.delete({ where: { id: parsed.data.phraseId } });
  return NextResponse.json({ ok: true });
}
