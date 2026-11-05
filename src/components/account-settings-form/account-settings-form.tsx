"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { apiRequest } from "@/lib/api-client";
import { FormError, FormSuccess } from "@/components/auth/form-feedback";
import { LOCALES, LOCALE_LABELS, type AppLocale } from "@/i18n/config";
import type { AccountProfile } from "@/types";

const MIN_PASSWORD_LENGTH = 12;

type AccountPayload = {
  name?: string;
  newPassword?: string;
  currentPassword?: string;
  locale?: AppLocale;
};

/** Prénom, langue et mot de passe ; sert aussi de configuration à la première connexion. */
export function AccountSettingsForm({ initialProfile }: { initialProfile: AccountProfile }) {
  const router = useRouter();
  const { update } = useSession();
  const t = useTranslations("account");
  const tCommon = useTranslations("common");
  const tApi = useTranslations("apiClient");
  const activeLocale = useLocale();
  const fieldId = useId();
  const [, startTransition] = useTransition();

  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [savingLocale, setSavingLocale] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState(initialProfile.name ?? "");
  const [locale, setLocale] = useState<AppLocale>(initialProfile.locale);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isSetup = profile.mustChangePassword;
  const id = (field: string) => `${fieldId}-${field}`;

  function validate(): string | null {
    if (newPassword && newPassword !== confirmPassword) {
      return t("passwordMismatch");
    }
    if (isSetup && !newPassword) {
      return t("newPasswordRequired");
    }
    if (!isSetup && !newPassword && name.trim() === (profile.name ?? "").trim()) {
      return t("noChanges");
    }
    return null;
  }

  async function patchAccount(payload: AccountPayload, fallbackError: string) {
    return apiRequest<AccountProfile>("/api/account", {
      method: "PATCH",
      json: payload,
      fallbackError,
      networkError: tApi("network"),
    });
  }

  async function handleLocaleChange(next: AppLocale) {
    if (next === locale) return;
    setLocale(next);
    setError("");
    setSuccess("");
    setSavingLocale(true);

    const result = await patchAccount({ locale: next }, t("language.fallbackError"));
    setSavingLocale(false);

    if (!result.ok) {
      setLocale(locale);
      setError(result.error);
      return;
    }

    setProfile(result.data);
    await update({ locale: result.data.locale });
    // Recharge les messages serveur (layout) dans la nouvelle langue
    startTransition(() => router.refresh());
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
    const result = await patchAccount(payload, t("fallbackError"));
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
      setSuccess(t("saved"));
      return;
    }

    if (isSetup) {
      router.push(updated.isAdmin ? "/admin" : "/dashboard");
      router.refresh();
      return;
    }

    setSuccess(t("updated"));
  }

  return (
    <div className={`mx-auto w-full max-w-md ${isSetup ? "surface-spark" : "surface -rotate-1"}`}>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-ink">
          {isSetup ? t("setupTitle") : t("title")}
        </h1>
        <p className="mt-1 text-sm text-ink-faint">{isSetup ? t("setupSubtitle") : t("subtitle")}</p>
        <p className="mt-2 text-xs text-ink-faint">{profile.email}</p>
      </div>

      <div className="mb-6">
        <label htmlFor={id("locale")} className="mb-1 block text-sm font-semibold text-ink-muted">
          {t("language.label")}
        </label>
        <select
          id={id("locale")}
          className="input"
          value={locale}
          disabled={savingLocale}
          aria-describedby={id("locale-hint")}
          onChange={(e) => void handleLocaleChange(e.target.value as AppLocale)}
        >
          {LOCALES.map((code) => (
            <option key={code} value={code}>
              {LOCALE_LABELS[code]}
            </option>
          ))}
        </select>
        <p id={id("locale-hint")} className="mt-1 text-xs text-ink-faint">
          {t("language.hint")}
          {activeLocale !== locale ? ` · ${LOCALE_LABELS[locale]}` : ""}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor={id("name")} className="mb-1 block text-sm font-semibold text-ink-muted">
            {t("name")}
          </label>
          <input
            id={id("name")}
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

        {!isSetup && (
          <div>
            <label htmlFor={id("current")} className="mb-1 block text-sm font-semibold text-ink-muted">
              {t("currentPassword")}
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
              {t("currentPasswordHint")}
            </p>
          </div>
        )}

        <div>
          <label htmlFor={id("new")} className="mb-1 block text-sm font-semibold text-ink-muted">
            {isSetup ? t("newPassword") : t("newPasswordOptional")}
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
            {t("passwordHint", { min: MIN_PASSWORD_LENGTH })}
          </p>
        </div>

        {(isSetup || newPassword) && (
          <div>
            <label htmlFor={id("confirm")} className="mb-1 block text-sm font-semibold text-ink-muted">
              {t("confirmPassword")}
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
          {saving ? t("saving") : isSetup ? t("finishSetup") : tCommon("save")}
        </button>
      </form>

      {!isSetup && (
        <p className="mt-6 text-center">
          <Link href="/dashboard" className="text-sm text-ink-faint hover:text-accent">
            {tCommon("backToDashboard")}
          </Link>
        </p>
      )}
    </div>
  );
}
