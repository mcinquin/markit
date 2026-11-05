export const LOCALES = ["fr", "en"] as const;

export type AppLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "fr";

/** Cookie lu quand aucune session n'indique de préférence (pages publiques, après déconnexion). */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Nom de chaque langue dans sa propre langue, pour le sélecteur. */
export const LOCALE_LABELS: Record<AppLocale, string> = {
  fr: "Français",
  en: "English",
};

export function isLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Langue valide, ou la langue par défaut. */
export function toLocale(value: unknown): AppLocale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
