import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, validateNewPassword, validateUserName } from "@/lib/account";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, inviteToken } = body;

    if (!inviteToken || typeof inviteToken !== "string") {
      return NextResponse.json({ error: "Lien d'invitation requis" }, { status: 403 });
    }

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

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
    }

    const nameResult = validateUserName(name);
    if ("error" in nameResult) {
      return NextResponse.json({ error: nameResult.error }, { status: 400 });
    }

    if (typeof email !== "string" || email.length > MAX_EMAIL_LENGTH) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json({ error: "Format d'email invalide" }, { status: 400 });
    }

    const passwordResult = validateNewPassword(password);
    if ("error" in passwordResult) {
      return NextResponse.json({ error: passwordResult.error }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "Impossible de créer ce compte" }, { status: 409 });
    }

    const hashedPassword = await hashPassword(passwordResult.value);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: nameResult.value,
          email: normalizedEmail,
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
