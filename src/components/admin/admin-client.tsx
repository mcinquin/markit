"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AdminInvite, AdminUser } from "@/types";

type Tab = "users" | "invites";

type Props = {
  initialUsers: AdminUser[];
  initialInvites: AdminInvite[];
};

export function AdminClient({ initialUsers, initialInvites }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [invites, setInvites] = useState(initialInvites);
  const [users] = useState(initialUsers);
  const [note, setNote] = useState("");
  const [validityDays, setValidityDays] = useState(7);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function fetchInvites() {
    const res = await fetch("/api/admin/invites");
    if (res.ok) setInvites(await res.json());
  }

  async function createInvite(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/admin/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note, validityDays }),
    });
    if (res.ok) {
      await fetchInvites();
      setNote("");
    }
    setCreating(false);
  }

  async function revokeInvite(id: string) {
    if (!confirm("Révoquer ce lien d'invitation ?")) return;
    await fetch("/api/admin/invites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setInvites((prev) => prev.filter((inv) => inv.id !== id));
  }

  function getInviteUrl(token: string) {
    return `${window.location.origin}/auth/signup?token=${token}`;
  }

  function copyLink(invite: AdminInvite) {
    navigator.clipboard.writeText(getInviteUrl(invite.token));
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function isExpired(invite: AdminInvite) {
    return new Date(invite.expiresAt) < new Date();
  }

  const activeInvites = invites.filter((i) => !i.usedAt && !isExpired(i));
  const usedInvites = invites.filter((i) => i.usedAt);
  const expiredInvites = invites.filter((i) => !i.usedAt && isExpired(i));

  const roleLabels: Record<string, string> = {
    OWNER: "Propriétaire",
    ADMIN: "Admin",
    MEMBER: "Membre",
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-ink">Administration<span className="text-accent">.</span></h1>
        <p className="mt-1 text-ink-faint">
          {users.length} utilisateur{users.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="mb-8 flex gap-1 border-b border-paper-line">
        {(
          [
            ["users", "Utilisateurs"],
            ["invites", "Invitations"],
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
            <div className="surface py-12 text-center text-ink-faint">Aucun utilisateur</div>
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
                        <span className="chip-spark">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-ink-faint">{user.email}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      Inscrit le{" "}
                      {new Date(user.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    {user.teams.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {user.teams.map(({ role, team }) => (
                          <span
                            key={team.id}
                            className="chip"
                          >
                            <span className="text-accent">{roleLabels[role] ?? role}</span>
                            {team.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs italic text-ink-faint">Aucune équipe</p>
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
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">
              Générer un lien d&apos;invitation
            </h2>
            <form onSubmit={createInvite} className="flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1">
                <label className="mb-1 block text-sm font-semibold text-ink-muted">
                  Note (optionnel)
                </label>
                <input
                  className="input"
                  placeholder="Pour Marie du pôle design"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="w-32">
                <label className="mb-1 block text-sm font-semibold text-ink-muted">
                  Validité (jours)
                </label>
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
                {creating ? "…" : "Générer"}
              </button>
            </form>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="mb-3 font-display text-base font-semibold text-ink">
                Actives ({activeInvites.length})
              </h2>
              {activeInvites.length === 0 ? (
                <p className="text-sm italic text-ink-faint">Aucune invitation active</p>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {activeInvites.map((invite) => (
                      <InviteRow
                        key={invite.id}
                        invite={invite}
                        copied={copiedId === invite.id}
                        onCopy={() => copyLink(invite)}
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
                  Utilisées ({usedInvites.length})
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
                  Expirées ({expiredInvites.length})
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
  const expiresDate = new Date(invite.expiresAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

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
          token: {invite.token.slice(0, 16)}…
        </p>
        <p className="mt-0.5 text-xs text-ink-faint">
          {status === "used"
            ? `Utilisé le ${new Date(invite.usedAt!).toLocaleDateString("fr-FR")}`
            : status === "expired"
              ? `Expiré le ${expiresDate}`
              : `Expire le ${expiresDate}`}
        </p>
      </div>

      <div className="flex flex-shrink-0 gap-2">
        {status === "active" && onCopy && (
          <button type="button" onClick={onCopy} className="btn-secondary py-1.5 px-3 text-sm">
            {copied ? "Copié" : "Copier"}
          </button>
        )}
        <button type="button" onClick={onRevoke} className="btn-danger py-1.5 px-3 text-sm">
          Supprimer
        </button>
      </div>
    </motion.div>
  );
}
