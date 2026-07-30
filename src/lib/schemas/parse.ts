import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";

export function zodErrorResponse(error: ZodError) {
  const message = error.issues[0]?.message ?? "Données invalides";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function parseJsonBody<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "JSON invalide" }, { status: 400 }),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, response: zodErrorResponse(parsed.error) };
  }

  return { ok: true, data: parsed.data };
}
