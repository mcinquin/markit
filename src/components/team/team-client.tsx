"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/api-client";
import { canDeleteOwnedResource } from "@/lib/authz-rules";
import { formatDistanceToNow } from "@/app/dashboard/utils/date";
import type { TeamCardSummary, TeamOverview } from "@/lib/data";

type Props = {
  team: TeamOverview;
  initialCards: TeamCardSummary[];
  userId: string;
  isAdmin: boolean;
};

function getCheckedCount(card: TeamCardSummary): number {
  return card.cells.filter((c) => c.checked.length > 0).length;
}

function getProgress(card: TeamCardSummary): number {
  if (!card.cells.length) return 0;
  return Math.round((getCheckedCount(card) / card.cells.length) * 100);
}

/** Vue d'une équipe : code d'invitation, liste des grilles, suppressions. */
export function TeamClient({ team, initialCards, userId, isAdmin }: Props) {
  const router = useRouter();
  const [cards, setCards] = useState(initialCards);
  const [copied, setCopied] = useState(false);
  const [deletingTeam, setDeletingTeam] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const canDelete = (createdById: string | null) =>
    canDeleteOwnedResource(userId, createdById, isAdmin);

  async function copyInviteCode() {
    try {
      await navigator.clipboard.writeText(team.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copie impossible, le code est : " + team.inviteCode);
    }
  }

  async function deleteTeam() {
    if (
      !confirm(
        `Supprimer l'équipe « ${team.name} » et toutes ses grilles ? Cette action est définitive.`
      )
    ) {
      return;
    }
    setDeletingTeam(true);
    setError("");
    const result = await apiRequest(`/api/teams/${team.id}`, {
      method: "DELETE",
      fallbackError: "Suppression impossible",
    });
    setDeletingTeam(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function deleteCard(card: TeamCardSummary) {
    if (!confirm(`Supprimer la grille « ${card.label} » ? Cette action est définitive.`)) {
      return;
    }
    setDeletingCardId(card.id);
    setError("");
    const result = await apiRequest(`/api/cards/${card.id}`, {
      method: "DELETE",
      fallbackError: "Suppression impossible",
    });
    setDeletingCardId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCards((prev) => prev.filter((c) => c.id !== card.id));
  }

  const memberCount = team._count.members;

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
            {team.name}
            <span className="text-accent">.</span>
          </h1>
          <p className="mt-1 text-ink-faint">
            {memberCount} membre{memberCount > 1 ? "s" : ""} · {cards.length} grille
            {cards.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void copyInviteCode()}
            className="btn-secondary py-2 text-sm"
          >
            {copied ? "Copié" : "Code d'invitation"}
          </button>
          <Link href={`/dashboard/teams/${team.id}/create`} className="btn-primary">
            + Nouvelle grille
          </Link>
          {canDelete(team.createdById) && (
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

      {error && (
        <p role="alert" className="mb-4 text-sm font-semibold text-danger">
          {error}
        </p>
      )}

      {cards.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface -rotate-1 py-16 text-center"
        >
          <h2 className="mb-2 font-display text-2xl text-ink-muted">Pas encore de grilles</h2>
          <p className="mb-6 text-ink-faint">Colle ta première grille pour cette semaine.</p>
          <Link href={`/dashboard/teams/${team.id}/create`} className="btn-primary inline-block">
            Créer la première grille
          </Link>
        </motion.div>
      ) : (
        <ul className="space-y-3">
          {cards.map((card, i) => (
            <TeamCardRow
              key={card.id}
              card={card}
              index={i}
              canDelete={canDelete(card.createdById)}
              isDeleting={deletingCardId === card.id}
              onDelete={() => void deleteCard(card)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function TeamCardRow({
  card,
  index,
  canDelete,
  isDeleting,
  onDelete,
}: {
  card: TeamCardSummary;
  index: number;
  canDelete: boolean;
  isDeleting: boolean;
  onDelete: () => void;
}) {
  const progress = getProgress(card);
  const checkedCount = getCheckedCount(card);
  const isComplete = progress === 100;

  return (
    <motion.li
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`surface-fun flex items-center gap-2 ${
        index % 2 === 0 ? "hover:rotate-1" : "hover:-rotate-1"
      } ${card.isActive ? "border-accent/40 bg-accent-mist" : ""}`}
    >
      <Link
        href={`/play/${card.id}`}
        className="flex min-w-0 flex-1 items-center gap-4 text-left"
      >
        <div
          aria-hidden
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-sm text-lg font-bold shadow-[1px_2px_0_rgba(15,23,42,0.08)] ${
            card.isActive
              ? "bg-accent text-white"
              : isComplete
                ? "bg-spark text-ink"
                : "bg-note text-ink-faint"
          }`}
        >
          {card.isActive ? "●" : isComplete ? "✓" : "○"}
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
          <span aria-hidden className="text-xl font-bold text-accent">
            →
          </span>
        </div>
      </Link>
      {canDelete && (
        <button
          type="button"
          className="shrink-0 rounded-sm px-2 py-1 text-xs font-bold text-danger hover:bg-danger/10"
          disabled={isDeleting}
          onClick={onDelete}
        >
          {isDeleting ? "…" : "Supprimer"}
        </button>
      )}
    </motion.li>
  );
}
