import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireApiSession();
  if (!auth.ok) return NextResponse.json({ isAdmin: false });

  const user = await prisma.user.findUnique({
    where: { id: auth.session.user.id },
    select: { isAdmin: true },
  });

  return NextResponse.json({ isAdmin: user?.isAdmin ?? false });
}
