"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "../../utils/date";

interface Card {
  id: string;
  label: string;
  rows: number;
  cols: number;
  isActive: boolean;
  createdAt: string;
  playedAt: string | null;
  cells: { checked: { id: string }[] }[];
}

interface Team {
  id: string;
  name: string;
  inviteCode: string;
  members: { user: { id: string; name: string | null; email: string } }[];
}

export default function TeamPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    const [teamsRes, cardsRes] = await Promise.all([
      fetch("/api/teams"),
      fetch(`/api/teams/${teamId}/cards`),
    ]);
    const teamsData = await teamsRes.json();
    const cardsData = await cardsRes.json();
    setTeam(teamsData.find((t: Team) => t.id === teamId) || null);
    setCards(cardsData);
    setLoading(false);
  }, [teamId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function copyInviteCode() {
    if (team) {
      navigator.clipboard.writeText(team.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function getCheckedCount(card: Card): number {
    return card.cells.filter((c) => c.checked.length > 0).length;
  }

  function getProgress(card: Card): number {
    if (!card.cells.length) return 0;
    return Math.round((getCheckedCount(card) / card.cells.length) * 100);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-4xl animate-spin">🎰</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link href="/dashboard" className="text-sm text-bingo-purple font-bold hover:underline mb-2 inline-block">
            ← Mes équipes
          </Link>
          <h1 className="text-4xl font-display text-bingo-purple">{team?.name}</h1>
          <p className="text-gray-500 mt-1">
            {team?.members.length} membre{(team?.members.length ?? 0) > 1 ? "s" : ""} · {cards.length} grille{cards.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={copyInviteCode} className="btn-secondary text-sm py-2">
            {copied ? "✅ Copié !" : "🔗 Code d'invitation"}
          </button>
          <Link href={`/dashboard/teams/${teamId}/create`} className="btn-primary">
            + Nouvelle grille
          </Link>
        </div>
      </div>

      {/* Cards grid */}
      {cards.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card text-center py-16"
        >
          <div className="text-6xl mb-4">🎯</div>
          <h2 className="text-2xl font-display text-gray-500 mb-2">Pas encore de grilles</h2>
          <p className="text-gray-400 mb-6">Crée ta première grille de bingo pour cette semaine !</p>
          <Link href={`/dashboard/teams/${teamId}/create`} className="btn-primary inline-block">
            Créer la première grille 🎉
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {cards.map((card, i) => {
            const progress = getProgress(card);
            const checkedCount = getCheckedCount(card);
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <div
                  className={`card flex items-center gap-4 cursor-pointer hover:scale-[1.01] transition-all duration-200 border-2 ${
                    card.isActive
                      ? "border-bingo-green/40 bg-gradient-to-r from-green-50 to-white"
                      : "border-transparent hover:border-bingo-purple/20"
                  }`}
                  onClick={() => router.push(`/play/${card.id}`)}
                >
                  {/* Status indicator */}
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${
                      card.isActive
                        ? "bg-green-100"
                        : progress === 100
                        ? "bg-yellow-100"
                        : "bg-purple-50"
                    }`}
                  >
                    {card.isActive ? "▶️" : progress === 100 ? "🏆" : "📋"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-display text-gray-800">{card.label}</h3>
                      {card.isActive && (
                        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                          EN COURS
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">
                      Grille {card.rows}×{card.cols} · Créée {formatDistanceToNow(card.createdAt)}
                    </p>
                  </div>

                  {/* Progress */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold text-gray-600">{checkedCount}/{card.cells.length}</p>
                      <p className="text-xs text-gray-400">cases cochées</p>
                    </div>
                    <div className="w-24 hidden sm:block">
                      <div className="h-2 bg-purple-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-bingo-pink to-bingo-purple rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1 text-center">{progress}%</p>
                    </div>
                    <span className="text-bingo-purple font-bold text-xl">→</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
