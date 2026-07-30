"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

    setLoading(false);

    if (result?.error) {
      setError("Email ou mot de passe incorrect");
    } else {
      const accountRes = await fetch("/api/account");
      if (accountRes.ok) {
        const account = await accountRes.json();
        router.push(account.mustChangePassword ? "/account" : "/dashboard");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="surface w-full max-w-md -rotate-1">
        <div className="mb-8">
          <Link href="/" className="font-display text-3xl font-bold text-ink">
            MarkIt<span className="text-accent">.</span>
          </Link>
          <p className="mt-2 text-ink-faint">Reconnecte-toi — la grille t&apos;attend</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-muted">Email</label>
            <input
              type="email"
              className="input"
              placeholder="toi@entreprise.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-muted">Mot de passe</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="rounded-sm border border-red-200 bg-danger-soft px-3 py-2 text-sm font-semibold text-danger shadow-[1px_2px_0_rgba(220,38,38,0.15)]">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Connexion…" : "C'est parti"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-ink-faint">
          L&apos;inscription se fait uniquement sur invitation.
        </p>
        <p className="mt-3 text-center">
          <Link href="/" className="text-sm text-ink-faint hover:text-accent">
            Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </main>
  );
}
