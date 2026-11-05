"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { apiRequest } from "@/lib/api-client";
import { FormError, FormSuccess } from "@/components/auth/form-feedback";
import type { AccountProfile } from "@/types";

const MIN_PASSWORD_LENGTH = 12;

type AccountPayload = { name: string; newPassword?: string; currentPassword?: string };

/** Prénom et mot de passe ; sert aussi de configuration à la première connexion. */
export function AccountSettingsForm({ initialProfile }: { initialProfile: AccountProfile }) {
  const router = useRouter();
  const { update } = useSession();
  const fieldId = useId();

  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState(initialProfile.name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isSetup = profile.mustChangePassword;
  const id = (field: string) => `${fieldId}-${field}`;

  function validate(): string | null {
    if (newPassword && newPassword !== confirmPassword) {
      return "Les mots de passe ne correspondent pas";
    }
    if (isSetup && !newPassword) {
      return "Choisis un nouveau mot de passe pour continuer";
    }
    if (!isSetup && !newPassword && name.trim() === (profile.name ?? "").trim()) {
      return "Aucune modification à enregistrer";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload: AccountPayload = { name: name.trim() };
    if (newPassword) {
      payload.newPassword = newPassword;
      if (!isSetup) payload.currentPassword = currentPassword;
    }

    setSaving(true);
    const result = await apiRequest<AccountProfile>("/api/account", {
      method: "PATCH",
      json: payload,
      fallbackError: "Erreur lors de la mise à jour",
    });
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    const updated = result.data;
    setProfile(updated);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    await update({ name: updated.name, mustChangePassword: updated.mustChangePassword });

    if (updated.mustChangePassword) {
      setSuccess("Enregistré");
      return;
    }

    if (isSetup) {
      router.push(updated.isAdmin ? "/admin" : "/dashboard");
      router.refresh();
      return;
    }

    setSuccess("Compte mis à jour");
  }

  return (
    <div className={`mx-auto w-full max-w-md ${isSetup ? "surface-spark" : "surface -rotate-1"}`}>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-ink">
          {isSetup ? "Configure ton compte" : "Mon compte"}
        </h1>
        <p className="mt-1 text-sm text-ink-faint">
          {isSetup
            ? "Première connexion : prénom et nouveau mot de passe."
            : "Modifie ton prénom ou ton mot de passe."}
        </p>
        <p className="mt-2 text-xs text-ink-faint">{profile.email}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor={id("name")} className="mb-1 block text-sm font-semibold text-ink-muted">
            Prénom
          </label>
          <input
            id={id("name")}
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

        {!isSetup && (
          <div>
            <label
              htmlFor={id("current")}
              className="mb-1 block text-sm font-semibold text-ink-muted"
            >
              Mot de passe actuel
            </label>
            <input
              id={id("current")}
              type="password"
              className="input"
              placeholder="••••••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              aria-describedby={id("current-hint")}
            />
            <p id={id("current-hint")} className="mt-1 text-xs text-ink-faint">
              Requis uniquement si tu changes le mot de passe
            </p>
          </div>
        )}

        <div>
          <label htmlFor={id("new")} className="mb-1 block text-sm font-semibold text-ink-muted">
            {isSetup ? "Nouveau mot de passe" : "Nouveau mot de passe (optionnel)"}
          </label>
          <input
            id={id("new")}
            type="password"
            className="input"
            placeholder="••••••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required={isSetup}
            minLength={MIN_PASSWORD_LENGTH}
            maxLength={128}
            autoComplete="new-password"
            aria-describedby={id("new-hint")}
          />
          <p id={id("new-hint")} className="mt-1 text-xs text-ink-faint">
            Minimum {MIN_PASSWORD_LENGTH} caractères
          </p>
        </div>

        {(isSetup || newPassword) && (
          <div>
            <label
              htmlFor={id("confirm")}
              className="mb-1 block text-sm font-semibold text-ink-muted"
            >
              Confirmer le mot de passe
            </label>
            <input
              id={id("confirm")}
              type="password"
              className="input"
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={MIN_PASSWORD_LENGTH}
              maxLength={128}
              autoComplete="new-password"
            />
          </div>
        )}

        <FormError message={error} />
        <FormSuccess message={success} />

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
