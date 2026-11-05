import { NextResponse } from "next/server";
import { requireApiAccountReady } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getCardIfMember } from "@/lib/authz";
import { emitCellUpdated } from "@/lib/realtime";
import { checkCellSchema } from "@/lib/schemas/card";
import { parseJsonBody } from "@/lib/schemas/parse";

type RouteContext = { params: Promise<{ cardId: string }> };

export async function POST(req: Request, { params }: RouteContext) {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  const { cardId } = await params;
  const { user } = auth.session;

  const access = await getCardIfMember(user.id, cardId);
  if (!access) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const parsed = await parseJsonBody(req, checkCellSchema);
  if (!parsed.ok) return parsed.response;

  const { cellId, checked } = parsed.data;

  const cell = await prisma.cell.findFirst({
    where: { id: cellId, cardId },
    select: { id: true },
  });
  if (!cell) return NextResponse.json({ error: "Case introuvable" }, { status: 404 });

  const userName = user.name || user.email || "?";

  if (checked) {
    // Upsert natif (ON CONFLICT) : deux clics simultanés ne lèvent pas d'erreur d'unicité
    const checkedCell = await prisma.checkedCell.upsert({
      where: { cellId },
      create: { cellId, userId: user.id },
      update: {},
    });
    emitCellUpdated(cardId, { cellId, checked: true, userName });
    return NextResponse.json(checkedCell);
  }

  await prisma.checkedCell.deleteMany({ where: { cellId } });
  emitCellUpdated(cardId, { cellId, checked: false, userName });
  return NextResponse.json({ ok: true });
}
