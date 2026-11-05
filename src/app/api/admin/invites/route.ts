import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getAdminInvites } from "@/lib/data";
import { createInviteSchema, deleteInviteSchema } from "@/lib/schemas/admin";
import { parseJsonBody } from "@/lib/schemas/parse";

export async function GET() {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  return NextResponse.json(await getAdminInvites());
}

export async function POST(req: Request) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(req, createInviteSchema);
  if (!parsed.ok) return parsed.response;

  const note =
    typeof parsed.data.note === "string" && parsed.data.note.length > 0
      ? parsed.data.note
      : null;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + parsed.data.validityDays);

  const invite = await prisma.inviteToken.create({
    data: {
      note,
      createdById: auth.session.user.id,
      expiresAt,
    },
  });

  return NextResponse.json(invite, { status: 201 });
}

export async function DELETE(req: Request) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(req, deleteInviteSchema);
  if (!parsed.ok) return parsed.response;

  await prisma.inviteToken.delete({ where: { id: parsed.data.id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
