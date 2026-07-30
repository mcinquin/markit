"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import type { DashboardTeam } from "@/types";

type Props = {
  initialTeams: DashboardTeam[];
  isAdmin?: boolean;
};

export function DashboardClient({ initialTeams, isAdmin = false }: Props) {
  const { data: session } = useSession();
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

  function canDeleteTeam(team: DashboardTeam) {
    if (isAdmin) return true;
    return Boolean(userId && team.createdById && team.createdById === userId);
  }

  async function fetchTeams() {
    const res = await fetch("/api/teams");
    if (res.ok) setTeams(await res.json());
  }

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: teamName }),
    });
    setCreating(false);
    if (res.ok) {
      await fetchTeams();
      setShowCreate(false);
      setTeamName("");
    } else {
      const d = await res.json();
      setError(d.error);
    }
  }

  async function joinTeam(e: React.FormEvent) {
    e.preventDefault();
    setJoining(true);
    setError("");
    const res = await fetch("/api/teams/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode }),
    });
    setJoining(false);
    if (res.ok) {
      await fetchTeams();
      setShowJoin(false);
      setInviteCode("");
    } else {
      const d = await res.json();
      setError(d.error);
    }
  }

  async function deleteTeam(team: DashboardTeam) {
    if (
      !confirm(
        `Supprimer l'équipe « ${team.name} » et toutes ses grilles ? Cette action est définitive.`
      )
    ) {
      return;
    }
    setDeletingId(team.id);
    setError("");
    const res = await fetch(`/api/teams/${team.id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) {
      setTeams((prev) => prev.filter((t) => t.id !== team.id));
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Suppression impossible");
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">
            Mes équipes<span className="text-accent">.</span>
          </h1>
          <p className="mt-1 text-ink-faint">Choisis ton camp et lance une grille</p>
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
            Rejoindre
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
            Créer
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
                  <label className="mb-1 block text-sm font-semibold text-ink-muted">
                    Nom de l&apos;équipe
                  </label>
                  <input
                    className="input"
                    placeholder="Équipe Produit"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? "Création…" : "Créer"}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">
                  Annuler
                </button>
              </form>
            )}

            {showJoin && (
              <form onSubmit={joinTeam} className="flex flex-wrap items-end gap-3">
                <div className="min-w-[200px] flex-1">
                  <label className="mb-1 block text-sm font-semibold text-ink-muted">
                    Code d&apos;invitation
                  </label>
                  <input
                    className="input"
                    placeholder="Colle le code ici"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={joining}>
                  {joining ? "…" : "Rejoindre"}
                </button>
                <button type="button" onClick={() => setShowJoin(false)} className="btn-secondary">
                  Annuler
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
          <h2 className="font-display text-xl font-semibold text-ink-muted">
            Personne ici… pour l&apos;instant
          </h2>
          <p className="mt-1 text-ink-faint">Crée ou rejoins une équipe pour ouvrir le bal.</p>
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
                    <p className="text-sm text-ink-faint">
                      {team.members.length} membre{team.members.length > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm font-semibold text-accent">
                  {team._count.cards} grille{team._count.cards !== 1 ? "s" : ""} →
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
                  {deletingId === team.id ? "…" : "Supprimer"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
