/**
 * Helpers partagés par les tests de composants (environnement jsdom).
 */

export const routerMock = {
  push: jest.fn(),
  replace: jest.fn(),
  refresh: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  prefetch: jest.fn(),
};

/** Réponse JSON telle que renvoyée par les routes API (jsdom n'expose pas `Response`). */
export function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

/** Remplace `fetch` global ; à appeler dans un `beforeEach`. */
export function mockFetch() {
  const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

/** Corps JSON envoyé lors du n-ième appel à `fetch`. */
export function sentJson(fetchMock: jest.Mock, call = 0): unknown {
  const init = fetchMock.mock.calls[call]?.[1] as RequestInit | undefined;
  return init?.body ? JSON.parse(String(init.body)) : undefined;
}
