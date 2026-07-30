import { z } from "zod";

export const createInviteSchema = z.object({
  note: z.string().trim().max(100).optional().nullable(),
  validityDays: z.coerce.number().int().min(1).max(30).optional().default(7),
});

export const deleteInviteSchema = z.object({
  id: z.string({ error: "ID requis" }).min(1, "ID requis"),
});
