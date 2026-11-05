/** Traducteur pour `dates.relative.*` (signature assouplie pour `useTranslations`). */
type RelativeTranslator = (key: string, values?: Record<string, number>) => string;

/**
 * Distance relative en langage naturel (`dates.relative.*`).
 */
export function formatDistanceToNow(date: string | Date, t: RelativeTranslator): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return t("today");
  if (diffDays === 1) return t("yesterday");
  if (diffDays < 7) return t("days", { count: diffDays });
  if (diffDays < 30) return t("weeks", { count: Math.floor(diffDays / 7) });
  if (diffDays < 365) return t("months", { count: Math.floor(diffDays / 30) });
  return t("years", { count: Math.floor(diffDays / 365) });
}
