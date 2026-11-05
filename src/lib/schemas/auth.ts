import { z } from "zod";
import { MAX_NAME_LENGTH, MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from "@/lib/account";
import { errorKey as msg } from "@/lib/error-keys";

export const registerSchema = z.object({
  name: z
    .string({ error: msg("nameRequired") })
    .trim()
    .min(1, msg("nameRequired"))
    .max(MAX_NAME_LENGTH, msg("nameLength")),
  email: z
    .string({ error: msg("emailInvalid") })
    .trim()
    .email(msg("emailFormat"))
    .max(254, msg("emailInvalid"))
    .transform((v) => v.toLowerCase()),
  password: z
    .string({ error: msg("passwordRequired") })
    .min(MIN_PASSWORD_LENGTH, msg("passwordTooShort"))
    .max(MAX_PASSWORD_LENGTH, msg("passwordTooLong")),
  inviteToken: z.string({ error: msg("inviteRequired") }).min(1, msg("inviteRequired")),
});

export type RegisterInput = z.infer<typeof registerSchema>;
