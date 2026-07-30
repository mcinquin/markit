import { z } from "zod";

export const createCardSchema = z.object({
  label: z
    .string({ error: "Label requis" })
    .trim()
    .min(1, "Label requis")
    .max(150, "Label trop long (max 150 caractères)"),
  rows: z.coerce.number().int().min(2).max(10),
  cols: z.coerce.number().int().min(2).max(10),
  freeCenter: z.boolean().optional().default(true),
  phraseIds: z.array(z.string().min(1)).min(1, "Phrases requises"),
});

export const updateCardSchema = z.object({
  isActive: z.boolean({ error: "Champ isActive invalide" }),
});

export const checkCellSchema = z.object({
  cellId: z.string({ error: "cellId invalide" }).min(1, "cellId invalide"),
  checked: z.boolean({ error: "checked invalide" }),
});

export type CreateCardInput = z.infer<typeof createCardSchema>;
