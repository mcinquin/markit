import { NextResponse } from "next/server";
import { requireApiAccountReady } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getCardIfMember } from "@/lib/authz";
import { checkCellSchema } from "@/lib/schemas/card";
import { parseJsonBody } from "@/lib/schemas/parse";

type RouteContext = { params: Promise<{ cardId: string }> };

export async function POST(req: Request, { params }: RouteContext) {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  const { cardId } = await params;

  const access = await getCardIfMember(auth.session.user.id, cardId);
  if (!access) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const parsed = await parseJsonBody(req, checkCellSchema);
  if (!parsed.ok) return parsed.response;

  const { cellId, checked } = parsed.data;

  const cell = await prisma.cell.findFirst({
    where: { id: cellId, cardId },
  });
  if (!cell) return NextResponse.json({ error: "Case introuvable" }, { status: 404 });

  if (checked) {
    const existing = await prisma.checkedCell.findUnique({ where: { cellId } });
    if (existing) return NextResponse.json(existing);

    const checkedCell = await prisma.checkedCell.create({
      data: { cellId, userId: auth.session.user.id },
    });

    if (global.io) {
      global.io.to(`card:${cardId}`).emit("cell-updated", {
        cellId,
        checked: true,
        userName: auth.session.user.name || auth.session.user.email,
      });
    }

    return NextResponse.json(checkedCell);
  }

  await prisma.checkedCell.deleteMany({ where: { cellId } });

  if (global.io) {
    global.io.to(`card:${cardId}`).emit("cell-updated", {
      cellId,
      checked: false,
      userName: auth.session.user.name || auth.session.user.email,
    });
  }

  return NextResponse.json({ ok: true });
}
