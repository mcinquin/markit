import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { ErrorKey } from "@/lib/error-keys";
import { toLocale, type AppLocale } from "@/i18n/config";

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
  locale: AppLocale;
};

const profileSelect = {
  id: true,
  name: true,
  email: true,
  isAdmin: true,
  mustChangePassword: true,
  locale: true,
} as const;

/** La colonne `locale` est un texte libre en BDD : on la ramène à une langue supportée. */
function toProfile<T extends { locale: string }>(user: T): T & { locale: AppLocale } {
  return { ...user, locale: toLocale(user.locale) };
}

export function validateUserName(name: unknown): { value: string } | { error: ErrorKey } {
  if (typeof name !== "string") {
    return { error: "nameRequired" };
  }

  const value = name.trim();
  if (value.length < 1 || value.length > MAX_NAME_LENGTH) {
    return { error: "nameLength" };
  }

  return { value };
}

export function validateNewPassword(password: unknown): { value: string } | { error: ErrorKey } {
  if (typeof password !== "string") {
    return { error: "passwordRequired" };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: "passwordTooShort" };
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return { error: "passwordTooLong" };
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
  const user = await prisma.user.findUnique({ where: { id: userId }, select: profileSelect });
  return user && toProfile(user);
}

type UpdateAccountInput = {
  name?: unknown;
  currentPassword?: unknown;
  newPassword?: unknown;
  locale?: AppLocale;
};

type UpdateAccountResult =
  | { ok: true; profile: AccountProfile }
  | { ok: false; error: ErrorKey; status: number };

/**
 * Met à jour le profil, la langue et/ou le mot de passe (première connexion ou changement volontaire).
 * La langue seule peut changer avant la fin de la configuration du compte.
 */
export async function updateAccount(
  userId: string,
  input: UpdateAccountInput
): Promise<UpdateAccountResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { ...profileSelect, password: true },
  });

  if (!user || !user.password) {
    return { ok: false, error: "accountNotFound", status: 404 };
  }

  const data: {
    name?: string;
    password?: string;
    mustChangePassword?: boolean;
    locale?: AppLocale;
  } = {};

  if (input.locale !== undefined) {
    data.locale = input.locale;
  }

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
        return { ok: false, error: "currentPasswordRequired", status: 400 };
      }

      const matches = await verifyPassword(input.currentPassword, user.password);
      if (!matches) {
        return { ok: false, error: "currentPasswordIncorrect", status: 401 };
      }
    }

    data.password = await hashPassword(passwordResult.value);
    data.mustChangePassword = false;
  }

  if (user.mustChangePassword && input.newPassword === undefined && input.name !== undefined) {
    return { ok: false, error: "newPasswordRequired", status: 400 };
  }

  if (Object.keys(data).length === 0) {
    return { ok: false, error: "noChanges", status: 400 };
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: profileSelect,
  });

  return { ok: true, profile: toProfile(updated) };
}
