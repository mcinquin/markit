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
      router.push("/dashboard");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎰</div>
          <h1 className="text-4xl font-display text-bingo-purple">MarkIt</h1>
          <p className="text-gray-500 mt-1">Bon retour parmi nous !</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">Email</label>
            <input
              type="email"
              className="input"
              placeholder="ton@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">Mot de passe</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-600 rounded-2xl px-4 py-3 text-sm font-semibold">
              ❌ {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter 🚀"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-xs">
            L&apos;inscription se fait uniquement sur invitation.
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-gray-400 text-sm hover:text-gray-600">
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
