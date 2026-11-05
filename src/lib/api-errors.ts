import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { MAX_NAME_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/account";
import type { ErrorKey } from "@/lib/error-keys";
import { MAX_CARD_LABEL_LENGTH } from "@/lib/schemas/card";
import { MAX_PHRASE_LENGTH } from "@/lib/schemas/phrase";
import { MAX_TEAM_NAME_LENGTH } from "@/lib/schemas/team";

/** Bornes interpolées dans les messages (ignorées par ceux qui ne les utilisent pas). */
const LIMIT_VALUES = {
  maxName: MAX_NAME_LENGTH,
  minPassword: MIN_PASSWORD_LENGTH,
  maxLabel: MAX_CARD_LABEL_LENGTH,
  maxPhrase: MAX_PHRASE_LENGTH,
  maxTeamName: MAX_TEAM_NAME_LENGTH,
};

type ApiErrorOptions = {
  /** Valeurs interpolées en plus des bornes. */
  values?: Record<string, number>;
  /** Code stable, indépendant de la langue, pour les clients qui doivent réagir à l'erreur. */
  code?: string;
};

/** Réponse `{ error }` traduite dans la langue de la requête. */
export async function apiError(key: ErrorKey, status: number, { values, code }: ApiErrorOptions = {}) {
  const t = await getTranslations("errors");
  const error = t(key, { ...LIMIT_VALUES, ...values });
  return NextResponse.json(code ? { error, code } : { error }, { status });
}
