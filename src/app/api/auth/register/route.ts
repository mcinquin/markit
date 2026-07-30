import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/account";
import { registerSchema } from "@/lib/schemas/auth";
import { parseJsonBody } from "@/lib/schemas/parse";

export async function POST(req: Request) {
  try {
    const parsed = await parseJsonBody(req, registerSchema);
    if (!parsed.ok) return parsed.response;

    const { name, email, password, inviteToken } = parsed.data;

    const invite = await prisma.inviteToken.findUnique({
      where: { token: inviteToken },
    });

    if (!invite) {
      return NextResponse.json({ error: "Lien d'invitation invalide" }, { status: 403 });
    }
    if (invite.usedAt) {
      return NextResponse.json({ error: "Ce lien d'invitation a déjà été utilisé" }, { status: 403 });
    }
    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "Ce lien d'invitation a expiré" }, { status: 403 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Impossible de créer ce compte" }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
      });

      await tx.inviteToken.update({
        where: { token: inviteToken },
        data: { usedAt: new Date(), usedById: newUser.id },
      });

      return newUser;
    });

    return NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 });
  } catch (error) {
    console.error("[register]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
