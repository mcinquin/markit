import fr from "@/i18n/messages/fr.json";

type Messages = typeof fr;

function lookup(messages: Messages, namespace: string | undefined, key: string): string {
  const path = namespace ? `${namespace}.${key}` : key;
  const parts = path.split(".");
  let current: unknown = messages;
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return path;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : path;
}

/** Remplace les pluriels ICU les plus simples utilisés dans les catalogues. */
function formatMessage(template: string, values?: Record<string, string | number | Date>): string {
  if (!values) return template;

  let result = template.replace(
    /\{(\w+),\s*plural,\s*one\s*\{([^}]*)\}\s*other\s*\{([^}]*)\}\}/g,
    (_match, name: string, one: string, other: string) => {
      const count = Number(values[name] ?? 0);
      const branch = count === 1 ? one : other;
      return branch.replace(/#/g, String(count));
    }
  );

  for (const [name, value] of Object.entries(values)) {
    result = result.replaceAll(`{${name}}`, String(value));
  }
  return result;
}

export function createTranslator(namespace?: string) {
  return (key: string, values?: Record<string, string | number | Date>) =>
    formatMessage(lookup(fr, namespace, key), values);
}

export const NextIntlClientProvider = ({ children }: { children: React.ReactNode }) => children;

export function useTranslations(namespace?: string) {
  return createTranslator(namespace);
}

export function useLocale() {
  return "fr";
}

export function useFormatter() {
  return {
    dateTime(date: Date, options?: Intl.DateTimeFormatOptions) {
      return new Intl.DateTimeFormat("fr-FR", options).format(date);
    },
  };
}
