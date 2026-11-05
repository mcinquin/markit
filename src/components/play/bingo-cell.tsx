"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import type { PlayCell } from "@/lib/data";

const SPRING = { type: "spring", stiffness: 420, damping: 20 } as const;
const POP = { duration: 0.35, ease: "easeOut" } as const;

type Props = {
  cell: PlayCell;
  isChecked: boolean;
  isFree: boolean;
  isWinning: boolean;
  onClick: () => void;
  cols: number;
  tilt: number;
};

function getCellClassName({ isFree, isChecked, isWinning }: Pick<Props, "isFree" | "isChecked" | "isWinning">) {
  if (isFree) {
    return "cursor-default border-spark-deep/40 bg-spark text-ink shadow-[2px_3px_0_rgba(15,23,42,0.12)]";
  }
  if (isChecked && isWinning) {
    return "bingo-line border-accent-hover bg-accent text-white shadow-[2px_3px_0_rgba(11,127,118,0.35)]";
  }
  if (isChecked) {
    return "border-accent/50 bg-accent-soft text-accent-hover shadow-[2px_3px_0_rgba(15,23,42,0.08)]";
  }
  if (isWinning) {
    return "border-spark bg-spark-soft text-ink shadow-[2px_3px_0_rgba(212,160,23,0.25)]";
  }
  return "border-paper-line bg-[#FFFEF8] text-ink shadow-[2px_3px_0_rgba(15,23,42,0.08)] hover:border-accent/40";
}

function getCornerClassName({ isFree, isChecked, isWinning }: Pick<Props, "isFree" | "isChecked" | "isWinning">) {
  if (isFree) return "border-t-spark-deep/30";
  if (isChecked) return isWinning ? "border-t-black/10" : "border-t-accent/20";
  return "border-t-black/[0.06]";
}

/** Case post-it de la grille de jeu. */
export function BingoCell({ cell, isChecked, isFree, isWinning, onClick, cols, tilt }: Props) {
  const t = useTranslations("play");
  const fontSize = cols <= 4 ? "text-sm" : cols <= 6 ? "text-xs" : "text-[10px]";
  const emojiSize = cols <= 4 ? "text-2xl" : cols <= 6 ? "text-xl" : "text-base";
  const checkedBy = cell.checked[0]?.user.name?.split(" ")[0] || "?";
  const isPopping = isChecked && !isFree;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={isFree}
      aria-pressed={isFree ? undefined : isChecked}
      whileHover={
        isFree ? undefined : { rotate: tilt - 2, y: -3, scale: 1.02, transition: SPRING }
      }
      whileTap={isFree ? undefined : { scale: 0.94, rotate: tilt + 3, transition: SPRING }}
      animate={
        isPopping
          ? { scale: [0.92, 1.06, 1], rotate: [tilt - 4, tilt + 2, tilt] }
          : { scale: 1, rotate: tilt }
      }
      // Les ressorts ne gèrent que 2 keyframes : le « pop » à 3 étapes passe par un tween
      transition={isPopping ? POP : SPRING}
      className={`sticky-note relative flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-sm border p-2 text-center ${getCellClassName({ isFree, isChecked, isWinning })}`}
    >
      {/* coin post-it */}
      <span
        aria-hidden
        className={`pointer-events-none absolute right-0 top-0 h-0 w-0 border-l-[14px] border-t-[14px] border-l-transparent ${getCornerClassName({ isFree, isChecked, isWinning })}`}
      />

      {isChecked && !isFree && (
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 flex items-center justify-center font-display text-5xl ${
            isWinning ? "text-white/20" : "text-accent/20"
          }`}
        >
          ✓
        </span>
      )}

      {isFree ? (
        <>
          <span aria-hidden className={emojiSize}>
            ★
          </span>
          <span className={`font-display font-bold ${fontSize}`}>{t("free")}</span>
        </>
      ) : (
        <>
          {cell.phrase.emoji && (
            <span aria-hidden className={emojiSize}>
              {cell.phrase.emoji}
            </span>
          )}
          <span
            className={`relative z-10 font-semibold leading-tight ${fontSize} ${
              isChecked && isWinning ? "text-white" : ""
            }`}
          >
            {cell.phrase.text}
          </span>
          {isChecked && cell.checked[0] && (
            <span
              className={`relative z-10 leading-none ${cols <= 4 ? "text-xs" : "text-[8px]"} ${
                isWinning ? "text-white/75" : "text-accent-hover/80"
              }`}
            >
              {checkedBy}
            </span>
          )}
        </>
      )}
    </motion.button>
  );
}
