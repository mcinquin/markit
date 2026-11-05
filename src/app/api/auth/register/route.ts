import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
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
      return await apiError("inviteInvalid", 403);
    }
    if (invite.usedAt) {
      return await apiError("inviteUsed", 403);
    }
    if (invite.expiresAt < new Date()) {
      return await apiError("inviteExpired", 403);
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return await apiError("accountCreationFailed", 409);
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
    return apiError("serverError", 500);
  }
}
