import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { getAdminUsers } from "@/lib/data";

export async function GET() {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  return NextResponse.json(await getAdminUsers());
}
