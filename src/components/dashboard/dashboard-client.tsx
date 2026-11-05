"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/api-client";
import { canDeleteTeam as canDeleteTeamRule } from "@/lib/authz-rules";
import { isTeamRole } from "@/lib/team-roles";
import type { DashboardTeam } from "@/types";

type Props = {
  initialTeams: DashboardTeam[];
  isAdmin?: boolean;
};

export function DashboardClient({ initialTeams, isAdmin = false }: Props) {
  const { data: session } = useSession();
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const tApi = useTranslations("apiClient");
  const userId = session?.user?.id;
  const [teams, setTeams] = useState(initialTeams);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const canDeleteTeam = (team: DashboardTeam) => {
    const role = team.members.find((m) => m.user.id === userId)?.role;
    return canDeleteTeamRule({
      userId: userId ?? "",
      role: isTeamRole(role) ? role : null,
      isSiteAdmin: isAdmin,
    });
  };

  async function fetchTeams() {
    const result = await apiRequest<DashboardTeam[]>("/api/teams", {
      fallbackError: tApi("fallback"),
      networkError: tApi("network"),
    });
    if (result.ok) setTeams(result.data);
  }

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    const result = await apiRequest("/api/teams", {
      method: "POST",
      json: { name: teamName },
      fallbackError: t("createFailed"),
      networkError: tApi("network"),
    });
    if (result.ok) {
      await fetchTeams();
      setShowCreate(false);
      setTeamName("");
    } else {
      setError(result.error);
    }
    setCreating(false);
  }

  async function joinTeam(e: React.FormEvent) {
    e.preventDefault();
    setJoining(true);
    setError("");
    const result = await apiRequest("/api/teams/join", {
      method: "POST",
      json: { inviteCode },
      fallbackError: t("joinFailed"),
      networkError: tApi("network"),
    });
    if (result.ok) {
      await fetchTeams();
      setShowJoin(false);
      setInviteCode("");
    } else {
      setError(result.error);
    }
    setJoining(false);
  }

  async function deleteTeam(team: DashboardTeam) {
    if (!confirm(t("confirmDeleteTeam", { name: team.name }))) return;

    setDeletingId(team.id);
    setError("");
    const result = await apiRequest(`/api/teams/${team.id}`, {
      method: "DELETE",
      fallbackError: t("deleteFailed"),
      networkError: tApi("network"),
    });
    setDeletingId(null);
    if (result.ok) {
      setTeams((prev) => prev.filter((item) => item.id !== team.id));
    } else {
      setError(result.error);
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">
            {t("title")}
            <span className="text-accent">.</span>
          </h1>
          <p className="mt-1 text-ink-faint">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setShowJoin(true);
              setShowCreate(false);
              setError("");
            }}
            className="btn-secondary"
          >
            {t("join")}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCreate(true);
              setShowJoin(false);
              setError("");
            }}
            className="btn-primary"
          >
            {t("create")}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {(showCreate || showJoin) && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="surface mb-6 rotate-1"
          >
            {showCreate && (
              <form onSubmit={createTeam} className="flex flex-wrap items-end gap-3">
                <div className="min-w-[200px] flex-1">
                  <label className="mb-1 block text-sm font-semibold text-ink-muted">{t("teamName")}</label>
                  <input
                    className="input"
                    placeholder={t("teamNamePlaceholder")}
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? t("creating") : t("create")}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">
                  {tCommon("cancel")}
                </button>
              </form>
            )}

            {showJoin && (
              <form onSubmit={joinTeam} className="flex flex-wrap items-end gap-3">
                <div className="min-w-[200px] flex-1">
                  <label className="mb-1 block text-sm font-semibold text-ink-muted">{t("inviteCode")}</label>
                  <input
                    className="input"
                    placeholder={t("inviteCodePlaceholder")}
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={joining}>
                  {joining ? "…" : t("join")}
                </button>
                <button type="button" onClick={() => setShowJoin(false)} className="btn-secondary">
                  {tCommon("cancel")}
                </button>
              </form>
            )}

            {error && <p className="mt-3 text-sm font-semibold text-danger">{error}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {error && !showCreate && !showJoin && (
        <p className="mb-4 text-sm font-semibold text-danger">{error}</p>
      )}

      {teams.length === 0 ? (
        <div className="surface py-14 text-center">
          <h2 className="font-display text-xl font-semibold text-ink-muted">{t("emptyTitle")}</h2>
          <p className="mt-1 text-ink-faint">{t("emptySubtitle")}</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team, i) => (
            <li key={team.id} className="relative">
              <Link
                href={`/dashboard/teams/${team.id}`}
                className={`surface-fun block ${i % 2 === 0 ? "hover:rotate-1" : "hover:-rotate-1"}`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-accent text-sm font-bold text-white">
                    {team.name[0].toUpperCase()}
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-semibold text-ink">{team.name}</h2>
                    <p className="text-sm text-ink-faint">{t("memberCount", { count: team.members.length })}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm font-semibold text-accent">
                  {t("cardCount", { count: team._count.cards })} →
                </p>
              </Link>
              {canDeleteTeam(team) && (
                <button
                  type="button"
                  className="absolute right-3 top-3 rounded-sm px-2 py-1 text-xs font-bold text-danger hover:bg-danger/10"
                  disabled={deletingId === team.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void deleteTeam(team);
                  }}
                >
                  {deletingId === team.id ? "…" : tCommon("delete")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
