"use client";

import { useId, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MarkItLogo } from "@/components/markit-logo/markit-logo";
import { apiRequest } from "@/lib/api-client";
import { FormError } from "./form-feedback";

/** Inscription sur invitation, puis connexion automatique. */
export function SignUpForm({ inviteToken }: { inviteToken: string }) {
  const router = useRouter();
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
      fallbackError: "Erreur lors de l'inscription",
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
          <h1 className="mt-4 font-display text-xl font-semibold text-ink-muted">
            Créer ton compte
          </h1>
          <p className="mt-1 text-sm text-ink-faint">Tu as reçu une invitation.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor={`${fieldId}-name`} className="mb-1 block text-sm font-semibold text-ink-muted">
              Prénom
            </label>
            <input
              id={`${fieldId}-name`}
              type="text"
              className="input"
              placeholder="Alex"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="given-name"
              maxLength={100}
              required
            />
          </div>

          <div>
            <label htmlFor={`${fieldId}-email`} className="mb-1 block text-sm font-semibold text-ink-muted">
              Email
            </label>
            <input
              id={`${fieldId}-email`}
              type="email"
              className="input"
              placeholder="toi@entreprise.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label htmlFor={`${fieldId}-password`} className="mb-1 block text-sm font-semibold text-ink-muted">
              Mot de passe
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
              Minimum 12 caractères
            </p>
          </div>

          <FormError message={error} />

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Création…" : "Créer mon compte"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-faint">
          Déjà un compte ?{" "}
          <Link href="/auth/signin" className="font-semibold text-accent hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
