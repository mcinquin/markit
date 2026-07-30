"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "../../utils/date";

interface Card {
  id: string;
  label: string;
  rows: number;
  cols: number;
  isActive: boolean;
  createdAt: string;
  createdById: string | null;
  playedAt: string | null;
  cells: { checked: { id: string }[] }[];
}

interface Team {
  id: string;
  name: string;
  inviteCode: string;
  createdById: string | null;
  members: { user: { id: string; name: string | null; email: string } }[];
}

export default function TeamPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [team, setTeam] = useState<Team | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [deletingTeam, setDeletingTeam] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    const [teamsRes, cardsRes, adminRes] = await Promise.all([
      fetch("/api/teams"),
      fetch(`/api/teams/${teamId}/cards`),
      fetch("/api/admin/me"),
    ]);
    const teamsData = await teamsRes.json();
    const cardsData = await cardsRes.json();
    const adminData = adminRes.ok ? await adminRes.json() : { isAdmin: false };
    setTeam(teamsData.find((t: Team) => t.id === teamId) || null);
    setCards(cardsData);
    setIsAdmin(adminData.isAdmin === true);
    setLoading(false);
  }, [teamId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function canDelete(createdById: string | null | undefined) {
    if (isAdmin) return true;
    return Boolean(userId && createdById && createdById === userId);
  }

  function copyInviteCode() {
    if (team) {
      navigator.clipboard.writeText(team.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function deleteTeam() {
    if (!team) return;
    if (
      !confirm(
        `Supprimer l'équipe « ${team.name} » et toutes ses grilles ? Cette action est définitive.`
      )
    ) {
      return;
    }
    setDeletingTeam(true);
    setError("");
    const res = await fetch(`/api/teams/${team.id}`, { method: "DELETE" });
    setDeletingTeam(false);
    if (res.ok) {
      router.push("/dashboard");
      return;
    }
    const d = await res.json().catch(() => ({}));
    setError(d.error || "Suppression impossible");
  }

  async function deleteCard(card: Card) {
    if (!confirm(`Supprimer la grille « ${card.label} » ? Cette action est définitive.`)) {
      return;
    }
    setDeletingCardId(card.id);
    setError("");
    const res = await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
    setDeletingCardId(null);
    if (res.ok) {
      setCards((prev) => prev.filter((c) => c.id !== card.id));
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Suppression impossible");
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
        <div className="font-display text-ink-faint">…</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="mb-2 inline-block text-sm font-bold text-accent hover:underline"
          >
            ← Mes équipes
          </Link>
          <h1 className="font-display text-4xl font-semibold text-ink">
            {team?.name}
            <span className="text-accent">.</span>
          </h1>
          <p className="mt-1 text-ink-faint">
            {team?.members.length} membre{(team?.members.length ?? 0) > 1 ? "s" : ""} ·{" "}
            {cards.length} grille{cards.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={copyInviteCode} className="btn-secondary py-2 text-sm">
            {copied ? "Copié" : "Code d'invitation"}
          </button>
          <Link href={`/dashboard/teams/${teamId}/create`} className="btn-primary">
            + Nouvelle grille
          </Link>
          {team && canDelete(team.createdById) && (
            <button
              type="button"
              onClick={() => void deleteTeam()}
              disabled={deletingTeam}
              className="btn-secondary py-2 text-sm text-danger hover:border-danger"
            >
              {deletingTeam ? "…" : "Supprimer l'équipe"}
            </button>
          )}
        </div>
      </div>

      {error && <p className="mb-4 text-sm font-semibold text-danger">{error}</p>}

      {cards.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface -rotate-1 py-16 text-center"
        >
          <h2 className="mb-2 font-display text-2xl text-ink-muted">Pas encore de grilles</h2>
          <p className="mb-6 text-ink-faint">Colle ta première grille pour cette semaine.</p>
          <Link href={`/dashboard/teams/${teamId}/create`} className="btn-primary inline-block">
            Créer la première grille
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {cards.map((card, i) => {
            const progress = getProgress(card);
            const checkedCount = getCheckedCount(card);
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`surface-fun flex items-center gap-2 ${
                  i % 2 === 0 ? "hover:rotate-1" : "hover:-rotate-1"
                } ${card.isActive ? "border-accent/40 bg-accent-mist" : ""}`}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-4 text-left"
                  onClick={() => router.push(`/play/${card.id}`)}
                >
                  <div
                    className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-sm text-lg font-bold shadow-[1px_2px_0_rgba(15,23,42,0.08)] ${
                      card.isActive
                        ? "bg-accent text-white"
                        : progress === 100
                          ? "bg-spark text-ink"
                          : "bg-note text-ink-faint"
                    }`}
                  >
                    {card.isActive ? "●" : progress === 100 ? "✓" : "○"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg text-ink">{card.label}</h3>
                      {card.isActive && <span className="chip-accent">En cours</span>}
                    </div>
                    <p className="text-sm text-ink-faint">
                      Grille {card.rows}×{card.cols} · Créée {formatDistanceToNow(card.createdAt)}
                    </p>
                  </div>

                  <div className="hidden flex-shrink-0 items-center gap-4 sm:flex">
                    <div className="text-right">
                      <p className="text-sm font-bold text-ink-muted">
                        {checkedCount}/{card.cells.length}
                      </p>
                      <p className="text-xs text-ink-faint">cases</p>
                    </div>
                    <div className="w-24">
                      <div className="h-2 overflow-hidden rounded-sm bg-paper-line">
                        <div
                          className="h-full rounded-sm bg-gradient-to-r from-accent to-spark transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="mt-1 text-center text-xs text-ink-faint">{progress}%</p>
                    </div>
                    <span className="text-xl font-bold text-accent">→</span>
                  </div>
                </button>
                {canDelete(card.createdById) && (
                  <button
                    type="button"
                    className="shrink-0 rounded-sm px-2 py-1 text-xs font-bold text-danger hover:bg-danger/10"
                    disabled={deletingCardId === card.id}
                    onClick={() => void deleteCard(card)}
                  >
                    {deletingCardId === card.id ? "…" : "Supprimer"}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
