"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface Team {
  id: string;
  name: string;
  inviteCode: string;
  members: { user: { id: string; name: string | null; email: string } }[];
  _count: { cards: number };
}

export default function DashboardPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTeams();
  }, []);

  async function fetchTeams() {
    const res = await fetch("/api/teams");
    const data = await res.json();
    setTeams(data);
    setLoading(false);
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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display text-bingo-purple">Mes équipes</h1>
          <p className="text-gray-500 mt-1">Sélectionne une équipe pour jouer</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setShowJoin(true); setShowCreate(false); setError(""); }} className="btn-secondary">
            🔗 Rejoindre
          </button>
          <button onClick={() => { setShowCreate(true); setShowJoin(false); setError(""); }} className="btn-primary">
            + Créer
          </button>
        </div>
      </div>

      <AnimatePresence>
        {(showCreate || showJoin) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="card mb-6 border-2 border-bingo-purple/20"
          >
            {showCreate && (
              <form onSubmit={createTeam} className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-600 mb-1">
                    Nom de l&apos;équipe
                  </label>
                  <input
                    className="input"
                    placeholder="Ex: Équipe Produit 🚀"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? "Création..." : "Créer"}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">
                  Annuler
                </button>
              </form>
            )}

            {showJoin && (
              <form onSubmit={joinTeam} className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-600 mb-1">
                    Code d&apos;invitation
                  </label>
                  <input
                    className="input"
                    placeholder="Colle le code ici..."
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={joining}>
                  {joining ? "Rejoindre..." : "Rejoindre"}
                </button>
                <button type="button" onClick={() => setShowJoin(false)} className="btn-secondary">
                  Annuler
                </button>
              </form>
            )}

            {error && (
              <p className="mt-3 text-red-500 text-sm font-semibold">❌ {error}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-4xl animate-spin">🎰</div>
        </div>
      ) : teams.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card text-center py-16"
        >
          <div className="text-6xl mb-4">👥</div>
          <h2 className="text-2xl font-display text-gray-500 mb-2">Aucune équipe pour l&apos;instant</h2>
          <p className="text-gray-400">Crée ou rejoins une équipe pour commencer à jouer !</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team, i) => (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <Link href={`/dashboard/teams/${team.id}`}>
                <div className="card hover:scale-105 transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-bingo-purple/30 group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-bingo-pink to-bingo-purple flex items-center justify-center text-white font-display text-xl">
                      {team.name[0].toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-xl font-display text-gray-800 group-hover:text-bingo-purple transition-colors">
                        {team.name}
                      </h2>
                      <p className="text-sm text-gray-400">
                        {team.members.length} membre{team.members.length > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="bg-purple-50 text-bingo-purple px-3 py-1 rounded-full font-bold">
                      🎯 {team._count.cards} grille{team._count.cards !== 1 ? "s" : ""}
                    </span>
                    <span className="text-bingo-purple font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      Jouer →
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
