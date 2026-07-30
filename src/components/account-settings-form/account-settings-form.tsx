"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { AccountProfile } from "@/types";

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
      <div className="surface mx-auto max-w-md -rotate-1 py-12 text-center text-ink-faint">
        Chargement…
      </div>
    );
  }

  return (
    <div
      className={`mx-auto w-full max-w-md ${
        isSetup ? "surface-spark" : "surface -rotate-1"
      }`}
    >
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-ink">
          {isSetup ? "Configure ton compte" : "Mon compte"}
        </h1>
        <p className="mt-1 text-sm text-ink-faint">
          {isSetup
            ? "Première connexion : prénom et nouveau mot de passe."
            : "Modifie ton prénom ou ton mot de passe."}
        </p>
        {session?.user?.email && (
          <p className="mt-2 text-xs text-ink-faint">{session.user.email}</p>
        )}
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

        {!isSetup && (
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-muted">
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
            <p className="mt-1 text-xs text-ink-faint">
              Requis uniquement si tu changes le mot de passe
            </p>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-semibold text-ink-muted">
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
          <p className="mt-1 text-xs text-ink-faint">Minimum 12 caractères</p>
        </div>

        {(isSetup || newPassword) && (
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-muted">
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
          <div className="rounded-sm border border-red-200 bg-danger-soft px-3 py-2 text-sm font-semibold text-danger shadow-[1px_2px_0_rgba(220,38,38,0.15)]">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-sm border border-accent/30 bg-accent-soft px-3 py-2 text-sm font-semibold text-accent-hover shadow-[1px_2px_0_rgba(15,159,147,0.15)]">
            {success}
          </div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={saving}>
          {saving ? "Enregistrement…" : isSetup ? "Terminer la configuration" : "Enregistrer"}
        </button>
      </form>

      {!isSetup && (
        <p className="mt-6 text-center">
          <Link href="/dashboard" className="text-sm text-ink-faint hover:text-accent">
            Retour au tableau de bord
          </Link>
        </p>
      )}
    </div>
  );
}
