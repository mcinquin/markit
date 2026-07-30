import { z } from "zod";

export const createPhraseSchema = z.object({
  text: z
    .string({ error: "Texte requis" })
    .trim()
    .min(1, "Texte requis")
    .max(200, "Texte trop long (max 200 caractères)"),
  emoji: z.string().trim().max(4, "Emoji invalide").optional().or(z.literal("")),
});

export const deletePhraseSchema = z.object({
  phraseId: z.string({ error: "ID requis" }).min(1, "ID requis"),
});
