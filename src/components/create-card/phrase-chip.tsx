"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import type { TeamPhrase } from "@/lib/data";

type Props = {
  phrase: TeamPhrase;
  selected: boolean;
  editing?: boolean;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

/** Phrase sélectionnable ; boutons modifier / supprimer pour les phrases d'équipe. */
export function PhraseChip({ phrase, selected, editing, onClick, onEdit, onDelete }: Props) {
  const t = useTranslations("phraseChip");
  const isHighlighted = selected || editing;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`inline-flex items-center gap-0.5 rounded-sm border shadow-[1px_2px_0_rgba(15,23,42,0.08)] ${
        editing
          ? "border-accent bg-accent-soft"
          : selected
            ? "border-accent/40 bg-accent-soft"
            : "border-paper-line bg-note"
      }`}
    >
      <motion.button
        type="button"
        aria-pressed={selected}
        whileHover={{ y: isHighlighted ? 0 : -1 }}
        onClick={onClick}
        className={`rounded-sm px-3 py-1.5 text-sm font-semibold transition-colors ${
          isHighlighted ? "text-accent-hover" : "text-ink-muted hover:text-ink"
        }`}
      >
        {phrase.emoji && <span className="mr-1">{phrase.emoji}</span>}
        {phrase.text}
      </motion.button>

      {(onEdit || onDelete) && (
        <div className="flex items-center gap-0.5 pr-1">
          {onEdit && (
            <button
              type="button"
              title={t("edit")}
              aria-label={t("editLabel", { text: phrase.text })}
              onClick={onEdit}
              className="flex h-6 w-6 items-center justify-center rounded-sm text-xs font-bold text-ink-faint transition-colors hover:bg-white/70 hover:text-accent"
            >
              ✎
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              title={t("delete")}
              aria-label={t("deleteLabel", { text: phrase.text })}
              onClick={onDelete}
              className="flex h-6 w-6 items-center justify-center rounded-sm text-xs font-bold text-ink-faint transition-colors hover:bg-red-50 hover:text-red-500"
            >
              ×
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
