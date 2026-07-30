import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      isAdmin: true,
      createdAt: true,
      teams: {
        select: {
          role: true,
          team: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json(users);
}
