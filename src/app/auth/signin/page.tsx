"use client";

import { useId, useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MarkItLogo } from "@/components/markit-logo/markit-logo";
import { FormError } from "@/components/auth/form-feedback";

export default function SignInPage() {
  const router = useRouter();
  const t = useTranslations("signIn");
  const fieldId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (!result || result.error) {
      setLoading(false);
      setError(t("invalidCredentials"));
      return;
    }

    // Le garde serveur redirige vers /account si une configuration est requise
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="surface w-full max-w-md -rotate-1">
        <div className="mb-8">
          <Link href="/" className="inline-block">
            <MarkItLogo className="h-16 w-auto max-w-full" />
          </Link>
          <p className="mt-4 text-ink-faint">{t("tagline")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="relative">
              <input
                id={`${fieldId}-password`}
                autoComplete="current-password"
                type={showPassword ? "text" : "password"}
                className="input pr-11"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-faint hover:text-ink-muted"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <FormError message={error} />

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? t("submitting") : t("submit")}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-ink-faint">{t("inviteOnly")}</p>
        <p className="mt-3 text-center">
          <Link href="/" className="text-sm text-ink-faint hover:text-accent">
            {t("backHome")}
          </Link>
        </p>
      </div>
    </main>
  );
}
