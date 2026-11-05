"use client";

import { useId, useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MarkItLogo } from "@/components/markit-logo/markit-logo";
import { apiRequest } from "@/lib/api-client";
import { FormError } from "./form-feedback";

/** Inscription sur invitation, puis connexion automatique. */
export function SignUpForm({ inviteToken }: { inviteToken: string }) {
  const router = useRouter();
  const t = useTranslations("signUp");
  const tApi = useTranslations("apiClient");
  const fieldId = useId();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await apiRequest("/api/auth/register", {
      method: "POST",
      json: { name, email, password, inviteToken },
      fallbackError: t("fallbackError"),
      networkError: tApi("network"),
    });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const signInResult = await signIn("credentials", { email, password, redirect: false });
    if (signInResult?.error) {
      router.push("/auth/signin");
      return;
    }

    // Le garde serveur redirige vers /account si une configuration est requise
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="surface w-full max-w-md rotate-1">
        <div className="mb-8">
          <MarkItLogo className="h-16 w-auto max-w-full" />
          <h1 className="mt-4 font-display text-xl font-semibold text-ink-muted">{t("title")}</h1>
          <p className="mt-1 text-sm text-ink-faint">{t("subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor={`${fieldId}-name`} className="mb-1 block text-sm font-semibold text-ink-muted">
              {t("name")}
            </label>
            <input
              id={`${fieldId}-name`}
              type="text"
              className="input"
              placeholder={t("namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="given-name"
              maxLength={100}
              required
            />
          </div>

          <div>
            <label htmlFor={`${fieldId}-email`} className="mb-1 block text-sm font-semibold text-ink-muted">
              {t("email")}
            </label>
            <input
              id={`${fieldId}-email`}
              type="email"
              className="input"
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label htmlFor={`${fieldId}-password`} className="mb-1 block text-sm font-semibold text-ink-muted">
              {t("password")}
            </label>
            <input
              id={`${fieldId}-password`}
              type="password"
              className="input"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              aria-describedby={`${fieldId}-password-hint`}
              required
              minLength={12}
              maxLength={128}
            />
            <p id={`${fieldId}-password-hint`} className="mt-1 text-xs text-ink-faint">
              {t("passwordHint", { min: 12 })}
            </p>
          </div>

          <FormError message={error} />

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? t("submitting") : t("submit")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-faint">
          {t("hasAccount")}{" "}
          <Link href="/auth/signin" className="font-semibold text-accent hover:underline">
            {t("signIn")}
          </Link>
        </p>
      </div>
    </main>
  );
}
