"use client";

import { Suspense, useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MarkItLogo } from "@/components/markit-logo/markit-logo";

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("token") ?? "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!inviteToken) {
      router.replace("/auth/signin");
    }
  }, [inviteToken, router]);

  if (!inviteToken) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, inviteToken }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erreur lors de l'inscription");
      setLoading(false);
      return;
    }

    await signIn("credentials", { email, password, redirect: false });
    const accountRes = await fetch("/api/account");
    if (accountRes.ok) {
      const account = await accountRes.json();
      router.push(account.mustChangePassword ? "/account" : "/dashboard");
    } else {
      router.push("/dashboard");
    }
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
            <label className="mb-1 block text-sm font-semibold text-ink-muted">Prénom</label>
            <input
              type="text"
              className="input"
              placeholder="Alex"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

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
              minLength={12}
            />
            <p className="mt-1 text-xs text-ink-faint">Minimum 12 caractères</p>
          </div>

          {error && (
            <div className="rounded-sm border border-red-200 bg-danger-soft px-3 py-2 text-sm font-semibold text-danger shadow-[1px_2px_0_rgba(220,38,38,0.15)]">
              {error}
            </div>
          )}

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

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}
