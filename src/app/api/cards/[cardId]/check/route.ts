import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCardIfMember } from "@/lib/authz";

type RouteContext = { params: Promise<{ cardId: string }> };

export async function POST(req: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { cardId } = await params;

  // Vérifie que l'utilisateur appartient à l'équipe de cette grille
  const access = await getCardIfMember(session.user.id, cardId);
  if (!access) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await req.json();
  const { cellId, checked } = body;

  if (!cellId || typeof cellId !== "string") {
    return NextResponse.json({ error: "cellId invalide" }, { status: 400 });
  }
  if (typeof checked !== "boolean") {
    return NextResponse.json({ error: "checked invalide" }, { status: 400 });
  }

  // Vérifie que la cellule appartient bien à cette grille (pas d'IDOR inter-grilles)
  const cell = await prisma.cell.findFirst({
    where: { id: cellId, cardId },
  });
  if (!cell) return NextResponse.json({ error: "Case introuvable" }, { status: 404 });

  if (checked) {
    const existing = await prisma.checkedCell.findUnique({ where: { cellId } });
    if (existing) return NextResponse.json(existing);

    const checkedCell = await prisma.checkedCell.create({
      data: { cellId, userId: session.user.id },
    });

    if (global.io) {
      global.io.to(`card:${cardId}`).emit("cell-updated", {
        cellId,
        checked: true,
        userName: session.user.name || session.user.email,
      });
    }

    return NextResponse.json(checkedCell);
  } else {
    await prisma.checkedCell.deleteMany({ where: { cellId } });

    if (global.io) {
      global.io.to(`card:${cardId}`).emit("cell-updated", {
        cellId,
        checked: false,
        userName: session.user.name || session.user.email,
      });
    }

    return NextResponse.json({ ok: true });
  }
}
