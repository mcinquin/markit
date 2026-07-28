import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;
export const MAX_NAME_LENGTH = 100;
export const BCRYPT_ROUNDS = 12;

export type AccountProfile = {
  id: string;
  name: string | null;
  email: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
};

export function validateUserName(name: unknown): { value: string } | { error: string } {
  if (typeof name !== "string") {
    return { error: "Le prénom est requis" };
  }

  const value = name.trim();
  if (value.length < 1 || value.length > MAX_NAME_LENGTH) {
    return { error: `Le prénom doit faire entre 1 et ${MAX_NAME_LENGTH} caractères` };
  }

  return { value };
}

export function validateNewPassword(password: unknown): { value: string } | { error: string } {
  if (typeof password !== "string") {
    return { error: "Le mot de passe est requis" };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`,
    };
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return { error: "Mot de passe trop long" };
  }

  return { value: password };
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return compare(plain, hashed);
}

export async function getAccountProfile(userId: string): Promise<AccountProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      isAdmin: true,
      mustChangePassword: true,
    },
  });

  return user;
}

type UpdateAccountInput = {
  name?: unknown;
  currentPassword?: unknown;
  newPassword?: unknown;
};

type UpdateAccountResult =
  | { ok: true; profile: AccountProfile }
  | { ok: false; error: string; status: number };

/**
 * Met à jour le profil et/ou le mot de passe (première connexion ou changement volontaire).
 */
export async function updateAccount(
  userId: string,
  input: UpdateAccountInput
): Promise<UpdateAccountResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      password: true,
      isAdmin: true,
      mustChangePassword: true,
    },
  });

  if (!user || !user.password) {
    return { ok: false, error: "Compte introuvable", status: 404 };
  }

  const data: { name?: string; password?: string; mustChangePassword?: boolean } = {};

  if (input.name !== undefined) {
    const nameResult = validateUserName(input.name);
    if ("error" in nameResult) {
      return { ok: false, error: nameResult.error, status: 400 };
    }
    data.name = nameResult.value;
  }

  if (input.newPassword !== undefined) {
    const passwordResult = validateNewPassword(input.newPassword);
    if ("error" in passwordResult) {
      return { ok: false, error: passwordResult.error, status: 400 };
    }

    if (!user.mustChangePassword) {
      if (typeof input.currentPassword !== "string" || !input.currentPassword) {
        return { ok: false, error: "Mot de passe actuel requis", status: 400 };
      }

      const matches = await verifyPassword(input.currentPassword, user.password);
      if (!matches) {
        return { ok: false, error: "Mot de passe actuel incorrect", status: 401 };
      }
    }

    data.password = await hashPassword(passwordResult.value);
    data.mustChangePassword = false;
  }

  if (user.mustChangePassword && input.newPassword === undefined) {
    return {
      ok: false,
      error: "Tu dois définir un nouveau mot de passe pour continuer",
      status: 400,
    };
  }

  if (Object.keys(data).length === 0) {
    return { ok: false, error: "Aucune modification demandée", status: 400 };
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      isAdmin: true,
      mustChangePassword: true,
    },
  });

  return { ok: true, profile: updated };
}
