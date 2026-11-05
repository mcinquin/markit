import { z } from "zod";
import { errorKey as msg } from "@/lib/error-keys";

export const MAX_PHRASE_LENGTH = 200;

const phraseText = z
  .string({ error: msg("phraseTextRequired") })
  .trim()
  .min(1, msg("phraseTextRequired"))
  .max(MAX_PHRASE_LENGTH, msg("phraseTextTooLong"));

const phraseId = z.string({ error: msg("idRequired") }).min(1, msg("idRequired"));

export const createPhraseSchema = z.object({
  text: phraseText,
  emoji: z.preprocess(
    (val) => (val === null || val === "" ? undefined : val),
    z.string().trim().max(16, msg("emojiInvalid")).optional()
  ),
});

export const deletePhraseSchema = z.object({
  phraseId,
});

export const updatePhraseSchema = z.object({
  phraseId,
  text: phraseText,
  emoji: z.preprocess(
    (val) => (val === null || val === "" ? null : val),
    z.union([z.string().trim().max(16, msg("emojiInvalid")), z.null()]).optional()
  ),
});
