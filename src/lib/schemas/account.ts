import { z } from "zod";
import { MAX_NAME_LENGTH, MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from "@/lib/account";

export const updateAccountSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Le prénom est requis")
      .max(MAX_NAME_LENGTH, `Le prénom doit faire entre 1 et ${MAX_NAME_LENGTH} caractères`)
      .optional(),
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`)
      .max(MAX_PASSWORD_LENGTH, "Mot de passe trop long")
      .optional(),
  })
  .refine((data) => data.name !== undefined || data.newPassword !== undefined, {
    message: "Aucune modification demandée",
  });

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
