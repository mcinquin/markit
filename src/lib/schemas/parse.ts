import type { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { apiError } from "@/lib/api-errors";
import { isErrorKey } from "@/lib/error-keys";

/** Les messages des schémas sont des clés `errors.*` ; les messages Zod par défaut deviennent « Données invalides ». */
export async function zodErrorResponse(error: ZodError) {
  const message = error.issues[0]?.message;
  return apiError(isErrorKey(message) ? message : "invalidData", 400);
}

export async function parseJsonBody<T>(
  req: Request,
  schema: ZodType<T>
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: await apiError("invalidJson", 400) };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, response: await zodErrorResponse(parsed.error) };
  }

  return { ok: true, data: parsed.data };
}
