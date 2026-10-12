# Security

## Reporting a vulnerability

Do not open a public issue for a security problem. Contact the repository maintainer privately (GitHub Security Advisories or direct message).

## Deployment best practices

- Set `NEXTAUTH_SECRET` to a strong value (`openssl rand -base64 32`).
- Set a strong `POSTGRES_DB_PASSWORD` in production; never commit `.env`.
- Expose the application behind an HTTPS reverse proxy (Apache config in `apache/markit.conf`). The Compose file binds the app to `127.0.0.1` only; the database has no public port.
- Keep `NEXTAUTH_URL` aligned with the public HTTPS URL in production (or `http://127.0.0.1:<PORT>` for plain HTTP).
- Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` (≥ 12 characters) only for the initial bootstrap, then change the password on first login (`/account`).
- Back up PostgreSQL regularly — see [wiki · Data and backup](https://github.com/mcinquin/markit/wiki/Data-and-backup).

## What is already in place

| Measure | Implementation | Detail |
| --- | --- | --- |
| Forced HTTPS | Apache 301 redirect + HSTS | 2 years, includeSubDomains, preload |
| Secure cookies | `Secure` + `HttpOnly` when HTTPS | Via NextAuth `useSecureCookies` |
| Passwords | **bcrypt** (cost 12) | Resistant to rainbow tables |
| JWT sessions | Signed with `NEXTAUTH_SECRET`, 7 days | Token invalidated if the secret changes |
| API authorization | Team membership checks | Protection against IDOR |
| Socket.io auth | NextAuth JWT verified server-side | `userName` resolved on the server |
| Socket.io CORS | Restricted to `NEXTAUTH_URL` in prod | `*` only in dev |
| CSP | Separate for dev/prod, no `unsafe-eval` in prod | Helps mitigate XSS |
| X-Frame-Options | `SAMEORIGIN` | Anti-clickjacking |
| X-Content-Type-Options | `nosniff` | Anti-MIME sniffing |
| X-Forwarded-For | Overwritten by Apache | Prevents client IP spoofing |
| Request size | Apache `LimitRequestBody 1MB` | Mitigates simple DoS |
| Field lengths | Validated server-side on all APIs | Prevents oversized payloads |
| Isolated ports | App on `127.0.0.1`, DB with no public port | Unreachable from the Internet |
| Server headers | `X-Powered-By` and `Server` removed | Does not reveal the stack |
| TLS | TLS 1.2/1.3 only, AEAD ciphers | SSLv3/TLS 1.0/1.1 disabled |

## What remains on you

- **Auth rate limiting** — Fail2ban or Apache `mod_ratelimit` on `/api/auth/signin` and `/api/auth/register`.

  Example Fail2ban filter (`/etc/fail2ban/filter.d/markit-auth.conf`):

  ```ini
  [Definition]
  failregex = ^<HOST> .* "POST /api/auth/callback/credentials HTTP.*" 401
  ignoreregex =
  ```

- **HSTS preload submission** — the `preload` header is set; submit at <https://hstspreload.org/> once the domain is stable.
- **Regular updates** — `docker compose pull && docker compose up -d --build`, `npm audit fix`.
- **Log monitoring** — watch `markit_error.log` and Docker logs.

## Related

- [Wiki · Security](https://github.com/mcinquin/markit/wiki/Security)
- [Wiki · Docker](https://github.com/mcinquin/markit/wiki/Docker)
