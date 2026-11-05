import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { requireApiAccountReady } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getTeamActor, getTeamMembership } from "@/lib/authz";
import { canManagePhrases } from "@/lib/authz-rules";
import { getTeamPhrases } from "@/lib/data";
import {
  createPhraseSchema,
  deletePhraseSchema,
  updatePhraseSchema,
} from "@/lib/schemas/phrase";
import { parseJsonBody } from "@/lib/schemas/parse";

type RouteContext = { params: Promise<{ teamId: string }> };

type ReadyAuth = Extract<Awaited<ReturnType<typeof requireApiAccountReady>>, { ok: true }>;

/** 404 hors de l'équipe, 403 sous le rôle ADMIN ; null si autorisé. */
async function requirePhraseManager(auth: ReadyAuth, teamId: string) {
  const actor = await getTeamActor(auth.session.user.id, teamId, auth.profile.isAdmin);
  if (!actor) return apiError("notFound", 404);
  if (!canManagePhrases(actor)) {
    return apiError("adminOnlyPhrases", 403);
  }
  return null;
}

export async function GET(_req: Request, { params }: RouteContext) {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  const { teamId } = await params;

  const membership = await getTeamMembership(auth.session.user.id, teamId);
  if (!membership) return apiError("notFound", 404);

  return NextResponse.json(await getTeamPhrases(teamId));
}

export async function POST(req: Request, { params }: RouteContext) {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  const { teamId } = await params;

  const membership = await getTeamMembership(auth.session.user.id, teamId);
  if (!membership) return apiError("notFound", 404);

  const parsed = await parseJsonBody(req, createPhraseSchema);
  if (!parsed.ok) return parsed.response;

  const { text, emoji } = parsed.data;
  const phrase = await prisma.phrase.create({
    data: { text, emoji: emoji || null, teamId },
  });

  return NextResponse.json(phrase, { status: 201 });
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  const { teamId } = await params;

  const actorError = await requirePhraseManager(auth, teamId);
  if (actorError) return actorError;

  const parsed = await parseJsonBody(req, updatePhraseSchema);
  if (!parsed.ok) return parsed.response;

  const { phraseId, text, emoji } = parsed.data;
  const existing = await prisma.phrase.findUnique({ where: { id: phraseId } });

  if (!existing || existing.isDefault || existing.teamId !== teamId) {
    return apiError("notFound", 404);
  }

  const phrase = await prisma.phrase.update({
    where: { id: phraseId },
    data: {
      text,
      ...(emoji !== undefined ? { emoji } : {}),
    },
  });

  return NextResponse.json(phrase);
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  const { teamId } = await params;

  const actorError = await requirePhraseManager(auth, teamId);
  if (actorError) return actorError;

  const parsed = await parseJsonBody(req, deletePhraseSchema);
  if (!parsed.ok) return parsed.response;

  const phrase = await prisma.phrase.findUnique({
    where: { id: parsed.data.phraseId },
    include: { _count: { select: { cells: true } } },
  });

  if (!phrase || phrase.isDefault || phrase.teamId !== teamId) {
    return apiError("notFound", 404);
  }

  if (phrase._count.cells > 0) {
    return apiError("phraseInUse", 409);
  }

  await prisma.phrase.delete({ where: { id: parsed.data.phraseId } });
  return NextResponse.json({ ok: true });
}
