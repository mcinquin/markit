"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/api-client";
import { isTeamRole } from "@/lib/team-roles";
import type { AdminInvite, AdminUser } from "@/types";

type Tab = "users" | "invites";

type Props = {
  initialUsers: AdminUser[];
  initialInvites: AdminInvite[];
};

export function AdminClient({ initialUsers, initialInvites }: Props) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const tRoles = useTranslations("roles");
  const tApi = useTranslations("apiClient");
  const format = useFormatter();
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [invites, setInvites] = useState(initialInvites);
  const [users] = useState(initialUsers);
  const [note, setNote] = useState("");
  const [validityDays, setValidityDays] = useState(7);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function fetchInvites() {
    const result = await apiRequest<AdminInvite[]>("/api/admin/invites");
    if (result.ok) setInvites(result.data);
  }

  async function createInvite(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    const result = await apiRequest("/api/admin/invites", {
      method: "POST",
      json: { note, validityDays },
      fallbackError: t("createFailed"),
      networkError: tApi("network"),
    });
    if (result.ok) {
      await fetchInvites();
      setNote("");
    } else {
      setError(result.error);
    }
    setCreating(false);
  }

  async function revokeInvite(id: string) {
    if (!confirm(t("confirmRevoke"))) return;
    setError("");
    const result = await apiRequest("/api/admin/invites", {
      method: "DELETE",
      json: { id },
      fallbackError: t("deleteFailed"),
      networkError: tApi("network"),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setInvites((prev) => prev.filter((inv) => inv.id !== id));
  }

  function getInviteUrl(token: string) {
    return `${window.location.origin}/auth/signup?token=${token}`;
  }

  async function copyLink(invite: AdminInvite) {
    try {
      await navigator.clipboard.writeText(getInviteUrl(invite.token));
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError(t("copyFailed"));
    }
  }

  function isExpired(invite: AdminInvite) {
    return new Date(invite.expiresAt) < new Date();
  }

  const activeInvites = invites.filter((i) => !i.usedAt && !isExpired(i));
  const usedInvites = invites.filter((i) => i.usedAt);
  const expiredInvites = invites.filter((i) => !i.usedAt && isExpired(i));

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-ink">
          {t("title")}
          <span className="text-accent">.</span>
        </h1>
        <p className="mt-1 text-ink-faint">{t("userCount", { count: users.length })}</p>
      </div>

      {error && (
        <p role="alert" className="mb-4 text-sm font-semibold text-danger">
          {error}
        </p>
      )}

      <div className="mb-8 flex gap-1 border-b border-paper-line">
        {(
          [
            ["users", t("tabs.users")],
            ["invites", t("tabs.invites")],
          ] as [Tab, string][]
        ).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === tab
                ? "border-accent text-accent"
                : "border-transparent text-ink-faint hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "users" && (
        <div>
          {users.length === 0 ? (
            <div className="surface py-12 text-center text-ink-faint">{t("noUsers")}</div>
          ) : (
            <ul className="space-y-2">
              {users.map((user) => (
                <li key={user.id} className="surface flex items-start gap-4 py-4">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-sm bg-accent text-sm font-bold text-white">
                    {(user.name?.[0] ?? user.email[0]).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{user.name ?? "—"}</p>
                      {user.isAdmin && (
                        <span className="chip-spark">{tCommon("admin")}</span>
                      )}
                    </div>
                    <p className="text-sm text-ink-faint">{user.email}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {t("registeredOn", {
                        date: format.dateTime(new Date(user.createdAt), {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }),
                      })}
                    </p>
                    {user.teams.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {user.teams.map(({ role, team }) => (
                          <span
                            key={team.id}
                            className="chip"
                          >
                            <span className="text-accent">{isTeamRole(role) ? tRoles(role) : role}</span>
                            {team.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs italic text-ink-faint">{t("noTeam")}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === "invites" && (
        <div>
          <div className="surface mb-8 -rotate-1">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">{t("generateTitle")}</h2>
            <form onSubmit={createInvite} className="flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1">
                <label className="mb-1 block text-sm font-semibold text-ink-muted">{t("note")}</label>
                <input
                  className="input"
                  placeholder={t("notePlaceholder")}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="w-32">
                <label className="mb-1 block text-sm font-semibold text-ink-muted">{t("validity")}</label>
                <input
                  type="number"
                  className="input text-center"
                  min={1}
                  max={30}
                  value={validityDays}
                  onChange={(e) =>
                    setValidityDays(Math.max(1, Math.min(30, parseInt(e.target.value) || 7)))
                  }
                />
              </div>
              <button type="submit" className="btn-primary" disabled={creating}>
                {creating ? "…" : t("generate")}
              </button>
            </form>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="mb-3 font-display text-base font-semibold text-ink">
                {t("activeInvites", { count: activeInvites.length })}
              </h2>
              {activeInvites.length === 0 ? (
                <p className="text-sm italic text-ink-faint">{t("noActiveInvites")}</p>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {activeInvites.map((invite) => (
                      <InviteRow
                        key={invite.id}
                        invite={invite}
                        copied={copiedId === invite.id}
                        onCopy={() => void copyLink(invite)}
                        onRevoke={() => revokeInvite(invite.id)}
                        status="active"
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </section>

            {usedInvites.length > 0 && (
              <section>
                <h2 className="mb-3 font-display text-base font-semibold text-ink-muted">
                  {t("usedInvites", { count: usedInvites.length })}
                </h2>
                <div className="space-y-2">
                  {usedInvites.map((invite) => (
                    <InviteRow
                      key={invite.id}
                      invite={invite}
                      status="used"
                      onRevoke={() => revokeInvite(invite.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {expiredInvites.length > 0 && (
              <section>
                <h2 className="mb-3 font-display text-base font-semibold text-ink-faint">
                  {t("expiredInvites", { count: expiredInvites.length })}
                </h2>
                <div className="space-y-2">
                  {expiredInvites.map((invite) => (
                    <InviteRow
                      key={invite.id}
                      invite={invite}
                      status="expired"
                      onRevoke={() => revokeInvite(invite.id)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InviteRow({
  invite,
  status,
  copied,
  onCopy,
  onRevoke,
}: {
  invite: AdminInvite;
  status: "active" | "used" | "expired";
  copied?: boolean;
  onCopy?: () => void;
  onRevoke: () => void;
}) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const expiresDate = format.dateTime(new Date(invite.expiresAt), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const statusText =
    status === "used"
      ? t("usedOn", {
          date: format.dateTime(new Date(invite.usedAt!), {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        })
      : status === "expired"
        ? t("expiredOn", { date: expiresDate })
        : t("expiresOn", { date: expiresDate });

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className={`surface flex items-center gap-4 py-3 ${
        status === "active" ? "" : "opacity-70"
      }`}
    >
      <div className="min-w-0 flex-1">
        {invite.note && <p className="text-sm font-semibold text-ink">{invite.note}</p>}
        <p className="truncate font-mono text-xs text-ink-faint">
          {t("token", { token: invite.token.slice(0, 16) })}
        </p>
        <p className="mt-0.5 text-xs text-ink-faint">{statusText}</p>
      </div>

      <div className="flex flex-shrink-0 gap-2">
        {status === "active" && onCopy && (
          <button type="button" onClick={onCopy} className="btn-secondary py-1.5 px-3 text-sm">
            {copied ? tCommon("copied") : tCommon("copy")}
          </button>
        )}
        <button type="button" onClick={onRevoke} className="btn-danger py-1.5 px-3 text-sm">
          {tCommon("delete")}
        </button>
      </div>
    </motion.div>
  );
}
