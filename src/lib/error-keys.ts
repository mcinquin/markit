import catalog from "@/i18n/messages/fr.json";

/** Clé d'un message `errors.*` : les schémas et la logique serveur renvoient des clés, traduites à la réponse. */
export type ErrorKey = keyof (typeof catalog)["errors"];

export function isErrorKey(value: unknown): value is ErrorKey {
  return typeof value === "string" && Object.hasOwn(catalog.errors, value);
}

/** Identité typée : garantit qu'un message Zod est une clé existante. */
export const errorKey = (key: ErrorKey) => key;
