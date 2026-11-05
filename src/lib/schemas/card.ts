import { z } from "zod";
import { errorKey as msg } from "@/lib/error-keys";

export const MAX_CARD_LABEL_LENGTH = 150;

export const createCardSchema = z.object({
  label: z
    .string({ error: msg("labelRequired") })
    .trim()
    .min(1, msg("labelRequired"))
    .max(MAX_CARD_LABEL_LENGTH, msg("labelTooLong")),
  rows: z.coerce.number().int().min(2).max(10),
  cols: z.coerce.number().int().min(2).max(10),
  freeCenter: z.boolean().optional().default(true),
  phraseIds: z.array(z.string().min(1)).min(1, msg("phrasesRequired")),
});

export const updateCardSchema = z.object({
  isActive: z.boolean({ error: msg("invalidData") }),
});

export const checkCellSchema = z.object({
  cellId: z.string({ error: msg("invalidData") }).min(1, msg("invalidData")),
  checked: z.boolean({ error: msg("invalidData") }),
});

export type CreateCardInput = z.infer<typeof createCardSchema>;
