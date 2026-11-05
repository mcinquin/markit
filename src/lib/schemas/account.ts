import { z } from "zod";
import { MAX_NAME_LENGTH, MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from "@/lib/account";
import { errorKey as msg } from "@/lib/error-keys";
import { LOCALES } from "@/i18n/config";

export const updateAccountSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, msg("nameRequired"))
      .max(MAX_NAME_LENGTH, msg("nameLength"))
      .optional(),
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH, msg("passwordTooShort"))
      .max(MAX_PASSWORD_LENGTH, msg("passwordTooLong"))
      .optional(),
    locale: z.enum(LOCALES, { error: msg("localeInvalid") }).optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined || data.newPassword !== undefined || data.locale !== undefined,
    { message: msg("noChanges") }
  );

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
