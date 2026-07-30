import { z } from "zod";
import { MAX_NAME_LENGTH, MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from "@/lib/account";

export const registerSchema = z.object({
  name: z
    .string({ error: "Le prénom est requis" })
    .trim()
    .min(1, "Le prénom est requis")
    .max(MAX_NAME_LENGTH, `Le prénom doit faire entre 1 et ${MAX_NAME_LENGTH} caractères`),
  email: z
    .string({ error: "Email invalide" })
    .trim()
    .email("Format d'email invalide")
    .max(254, "Email invalide")
    .transform((v) => v.toLowerCase()),
  password: z
    .string({ error: "Le mot de passe est requis" })
    .min(MIN_PASSWORD_LENGTH, `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`)
    .max(MAX_PASSWORD_LENGTH, "Mot de passe trop long"),
  inviteToken: z.string({ error: "Lien d'invitation requis" }).min(1, "Lien d'invitation requis"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
