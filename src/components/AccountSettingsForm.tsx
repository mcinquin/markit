"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

type AccountProfile = {
  name: string | null;
  email: string;
  mustChangePassword: boolean;
  isAdmin: boolean;
};

export function AccountSettingsForm() {
  const router = useRouter();
  const { data: session, update } = useSession();

  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    fetch("/api/account")
      .then(async (res) => {
        if (!res.ok) throw new Error("fetch");
        return res.json() as Promise<AccountProfile>;
      })
      .then((data) => {
        setProfile(data);
        setName(data.name ?? "");
      })
      .catch(() => setError("Impossible de charger le compte"))
      .finally(() => setLoading(false));
  }, []);

  const isSetup = profile?.mustChangePassword ?? false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword && newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (isSetup && !newPassword) {
      setError("Choisis un nouveau mot de passe pour continuer");
      return;
    }

    const payload: Record<string, string> = { name: name.trim() };
    if (newPassword) {
      payload.newPassword = newPassword;
      if (!isSetup) {
        payload.currentPassword = currentPassword;
      }
    }

    if (!isSetup && !newPassword && name.trim() === (profile?.name ?? "").trim()) {
      setError("Aucune modification à enregistrer");
      return;
    }

    setSaving(true);

    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Erreur lors de la mise à jour");
      return;
    }

    setProfile(data);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    await update({
      name: data.name,
      mustChangePassword: data.mustChangePassword,
    });

    if (data.mustChangePassword) {
      setSuccess("Enregistré");
      return;
    }

    if (isSetup) {
      router.push(data.isAdmin ? "/admin" : "/dashboard");
      router.refresh();
      return;
    }

    setSuccess("Compte mis à jour");
  }

  if (loading) {
    return (
      <div className="card text-center text-gray-500 font-semibold py-12">
        Chargement…
      </div>
    );
  }

  return (
    <div className="card w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">{isSetup ? "👋" : "⚙️"}</div>
        <h1 className="text-3xl font-display text-bingo-purple">
          {isSetup ? "Configure ton compte" : "Mon compte"}
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          {isSetup
            ? "Première connexion : choisis ton prénom et un nouveau mot de passe."
            : "Modifie ton prénom ou ton mot de passe."}
        </p>
        {session?.user?.email && (
          <p className="text-gray-400 text-xs mt-2">{session.user.email}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-600 mb-1">Prénom</label>
          <input
            type="text"
            className="input"
            placeholder="Alex"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        {!isSetup && (
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">
              Mot de passe actuel
            </label>
            <input
              type="password"
              className="input"
              placeholder="••••••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
            <p className="text-xs text-gray-400 mt-1">
              Requis uniquement si tu changes le mot de passe
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-gray-600 mb-1">
            {isSetup ? "Nouveau mot de passe" : "Nouveau mot de passe (optionnel)"}
          </label>
          <input
            type="password"
            className="input"
            placeholder="••••••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required={isSetup}
            minLength={12}
            autoComplete="new-password"
          />
          <p className="text-xs text-gray-400 mt-1">Minimum 12 caractères</p>
        </div>

        {(isSetup || newPassword) && (
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              className="input"
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required={isSetup || !!newPassword}
              minLength={12}
              autoComplete="new-password"
            />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-600 rounded-2xl px-4 py-3 text-sm font-semibold">
            ❌ {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-2 border-green-200 text-green-700 rounded-2xl px-4 py-3 text-sm font-semibold">
            ✅ {success}
          </div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={saving}>
          {saving ? "Enregistrement…" : isSetup ? "Terminer la configuration 🎉" : "Enregistrer"}
        </button>
      </form>

      {!isSetup && (
        <div className="mt-6 text-center">
          <Link href="/dashboard" className="text-gray-400 text-sm hover:text-gray-600">
            ← Retour au tableau de bord
          </Link>
        </div>
      )}
    </div>
  );
}
