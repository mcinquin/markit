"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Invite {
  id: string;
  token: string;
  note: string | null;
  expiresAt: string;
  usedAt: string | null;
  usedById: string | null;
  createdBy: { name: string | null; email: string };
}

interface UserWithTeams {
  id: string;
  name: string | null;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  teams: {
    role: string;
    team: { id: string; name: string };
  }[];
}

type Tab = "users" | "invites";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [users, setUsers] = useState<UserWithTeams[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [note, setNote] = useState("");
  const [validityDays, setValidityDays] = useState(7);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data);
    setLoadingUsers(false);
  }, []);

  const fetchInvites = useCallback(async () => {
    setLoadingInvites(true);
    const res = await fetch("/api/admin/invites");
    const data = await res.json();
    setInvites(data);
    setLoadingInvites(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (activeTab === "invites" && invites.length === 0) fetchInvites();
  }, [activeTab, fetchInvites, invites.length]);

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

  function copyLink(invite: Invite) {
    navigator.clipboard.writeText(getInviteUrl(invite.token));
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function isExpired(invite: Invite) {
    return new Date(invite.expiresAt) < new Date();
  }

  const activeInvites = invites.filter((i) => !i.usedAt && !isExpired(i));
  const usedInvites = invites.filter((i) => i.usedAt);
  const expiredInvites = invites.filter((i) => !i.usedAt && isExpired(i));

  const roleColors: Record<string, string> = {
    OWNER: "bg-bingo-purple text-white",
    ADMIN: "bg-bingo-blue text-white",
    MEMBER: "bg-gray-100 text-gray-600",
  };
  const roleLabels: Record<string, string> = {
    OWNER: "Propriétaire",
    ADMIN: "Admin",
    MEMBER: "Membre",
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-display text-bingo-purple">⚙️ Administration</h1>
        <p className="text-gray-500 mt-1">
          {users.length} utilisateur{users.length !== 1 ? "s" : ""} enregistré{users.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-gray-200">
        {([["users", "👥 Utilisateurs"], ["invites", "✉️ Invitations"]] as [Tab, string][]).map(
          ([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 font-bold text-sm rounded-t-xl transition-colors -mb-px border-b-2 ${
                activeTab === tab
                  ? "text-bingo-purple border-bingo-purple bg-white"
                  : "text-gray-400 border-transparent hover:text-gray-600"
              }`}
            >
              {label}
            </button>
          )
        )}
      </div>

      {/* ── Onglet Utilisateurs ── */}
      {activeTab === "users" && (
        <div>
          {loadingUsers ? (
            <div className="flex justify-center py-12">
              <div className="text-4xl animate-spin">🎰</div>
            </div>
          ) : users.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">
              Aucun utilisateur enregistré
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user, i) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="card flex items-start gap-4 py-4"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-bingo-pink to-bingo-purple flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                    {(user.name?.[0] ?? user.email[0]).toUpperCase()}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-800">{user.name ?? "—"}</p>
                      {user.isAdmin && (
                        <span className="text-xs bg-bingo-purple text-white px-2 py-0.5 rounded-full font-bold">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{user.email}</p>
                    <p className="text-xs text-gray-300 mt-0.5">
                      Inscrit le{" "}
                      {new Date(user.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>

                    {/* Équipes */}
                    {user.teams.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {user.teams.map(({ role, team }) => (
                          <span
                            key={team.id}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border border-gray-200"
                          >
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${roleColors[role] ?? "bg-gray-100 text-gray-600"}`}
                            >
                              {roleLabels[role] ?? role}
                            </span>
                            {team.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-300 mt-2 italic">Aucune équipe</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Onglet Invitations ── */}
      {activeTab === "invites" && (
        <div>
          {/* Créer une invitation */}
          <div className="card mb-8 border-2 border-bingo-purple/20">
            <h2 className="text-xl font-display text-bingo-purple mb-4">
              Générer un lien d&apos;invitation
            </h2>
            <form onSubmit={createInvite} className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-bold text-gray-600 mb-1">
                  Note (optionnel)
                </label>
                <input
                  className="input"
                  placeholder="Ex: Pour Marie du pôle design"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="w-36">
                <label className="block text-sm font-bold text-gray-600 mb-1">
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
                {creating ? "Génération..." : "🔗 Générer le lien"}
              </button>
            </form>
          </div>

          {loadingInvites ? (
            <div className="flex justify-center py-12">
              <div className="text-4xl animate-spin">🎰</div>
            </div>
          ) : (
            <div className="space-y-8">
              <section>
                <h2 className="text-lg font-display text-gray-700 mb-3">
                  ✅ Actives ({activeInvites.length})
                </h2>
                {activeInvites.length === 0 ? (
                  <p className="text-gray-400 text-sm italic">Aucune invitation active</p>
                ) : (
                  <div className="space-y-3">
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
                  <h2 className="text-lg font-display text-gray-500 mb-3">
                    👤 Utilisées ({usedInvites.length})
                  </h2>
                  <div className="space-y-3">
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
                  <h2 className="text-lg font-display text-gray-400 mb-3">
                    ⏰ Expirées ({expiredInvites.length})
                  </h2>
                  <div className="space-y-3">
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
          )}
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
  invite: Invite;
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
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`card flex items-center gap-4 py-3 border-2 ${
        status === "active"
          ? "border-green-200"
          : status === "used"
          ? "border-gray-200 opacity-70"
          : "border-red-100 opacity-60"
      }`}
    >
      <div className="flex-1 min-w-0">
        {invite.note && <p className="font-semibold text-gray-700 text-sm">{invite.note}</p>}
        <p className="text-xs text-gray-400 font-mono truncate">
          token: {invite.token.slice(0, 16)}…
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {status === "used"
            ? `✓ Utilisé le ${new Date(invite.usedAt!).toLocaleDateString("fr-FR")}`
            : status === "expired"
            ? `⏰ Expiré le ${expiresDate}`
            : `Expire le ${expiresDate}`}
        </p>
      </div>

      <div className="flex gap-2 flex-shrink-0">
        {status === "active" && onCopy && (
          <button onClick={onCopy} className="btn-secondary py-1.5 px-3 text-sm">
            {copied ? "✅ Copié !" : "📋 Copier le lien"}
          </button>
        )}
        <button onClick={onRevoke} className="btn-danger py-1.5 px-3 text-sm">
          🗑 Supprimer
        </button>
      </div>
    </motion.div>
  );
}
