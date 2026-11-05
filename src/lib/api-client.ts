export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  /** Corps sérialisé en JSON (ajoute l'en-tête Content-Type). */
  json?: unknown;
  /** Message affiché si l'API ne renvoie pas de champ `error`. */
  fallbackError?: string;
};

const NETWORK_ERROR = "Connexion impossible, réessaie";
const DEFAULT_ERROR = "Une erreur est survenue";

/**
 * `fetch` côté client qui ne lève jamais : renvoie les données ou un message d'erreur affichable.
 */
export async function apiRequest<T = unknown>(
  url: string,
  { json, fallbackError = DEFAULT_ERROR, headers, ...init }: ApiRequestOptions = {}
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers:
        json === undefined ? headers : { "Content-Type": "application/json", ...headers },
      body: json === undefined ? undefined : JSON.stringify(json),
    });
  } catch {
    return { ok: false, error: NETWORK_ERROR, status: 0 };
  }

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const error =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : fallbackError;
    return { ok: false, error, status: res.status };
  }

  return { ok: true, data: body as T };
}
