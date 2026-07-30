"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Confetti from "react-confetti";
import { detectBingo, getCenterPosition } from "@/lib/bingo";
import { BingoPattern } from "@/types";

interface CellData {
  id: string;
  position: number;
  phrase: { id: string; text: string; emoji: string | null };
  checked: { id: string; userId: string; user: { id: string; name: string | null } }[];
}

interface CardData {
  id: string;
  label: string;
  rows: number;
  cols: number;
  freeCenter: boolean;
  isActive: boolean;
  team: {
    id: string;
    name: string;
    members: { user: { id: string; name: string | null; email: string } }[];
  };
  cells: CellData[];
}

export default function PlayPage() {
  const { cardId } = useParams<{ cardId: string }>();
  const { data: session } = useSession();

  const [card, setCard] = useState<CardData | null>(null);
  const [checkedCellIds, setCheckedCellIds] = useState<Set<string>>(new Set());
  const [bingoPatterns, setBingoPatterns] = useState<BingoPattern[]>([]);
  const [showBingo, setShowBingo] = useState(false);
  const [bingoWinner, setBingoWinner] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlineMembers, setOnlineMembers] = useState<{ id: string; name: string }[]>([]);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const socketRef = useRef<import("socket.io-client").Socket | null>(null);
  const prevBingoCount = useRef(0);
  const hideBingoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebratingRef = useRef(false);
  const cardRef = useRef<CardData | null>(null);

  useEffect(() => {
    cardRef.current = card;
  }, [card]);

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    const handler = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const celebrateBingo = useCallback((userName: string) => {
    if (celebratingRef.current) return;
    celebratingRef.current = true;
    setBingoWinner(userName);
    setShowBingo(true);
    if (hideBingoTimer.current) clearTimeout(hideBingoTimer.current);
    hideBingoTimer.current = setTimeout(() => {
      setShowBingo(false);
      celebratingRef.current = false;
    }, 4500);
  }, []);

  /** Met à jour les motifs ; optionnellement déclenche confettis (clic local). */
  const syncBingoFromChecked = useCallback(
    (
      nextChecked: Set<string>,
      data: CardData,
      options?: { celebrateAs?: string; broadcast?: boolean }
    ) => {
      const positions = new Set<number>();
      for (const cell of data.cells) {
        if (nextChecked.has(cell.id)) positions.add(cell.position);
      }

      const patterns = detectBingo(positions, data.rows, data.cols);
      setBingoPatterns(patterns);

      const isNewBingo = patterns.length > prevBingoCount.current;
      prevBingoCount.current = patterns.length;

      if (isNewBingo && options?.celebrateAs) {
        celebrateBingo(options.celebrateAs);
        if (options.broadcast) {
          socketRef.current?.emit("bingo", {
            cardId: data.id,
            pattern: patterns[patterns.length - 1],
          });
        }
      }
    },
    [celebrateBingo]
  );

  const fetchCard = useCallback(async () => {
    const res = await fetch(`/api/cards/${cardId}`);
    if (!res.ok) return;
    const data: CardData = await res.json();
    setCard(data);

    const checked = new Set(
      data.cells.filter((c) => c.checked.length > 0).map((c) => c.id)
    );
    setCheckedCellIds(checked);

    const positions = new Set(
      data.cells.filter((c) => c.checked.length > 0).map((c) => c.position)
    );
    const patterns = detectBingo(positions, data.rows, data.cols);
    setBingoPatterns(patterns);
    prevBingoCount.current = patterns.length;

    setLoading(false);
  }, [cardId]);

  useEffect(() => {
    fetchCard();
  }, [fetchCard]);

  useEffect(() => {
    if (!card || !session) return;

    const initSocket = async () => {
      const { getSocket } = await import("@/lib/socket");
      const socket = getSocket();
      socketRef.current = socket;

      socket.emit("join-card", { cardId: card.id });

      socket.on("cell-updated", ({ cellId, checked }: { cellId: string; checked: boolean }) => {
        const data = cardRef.current;
        if (!data) return;

        setCheckedCellIds((prev) => {
          const next = new Set(prev);
          if (checked) next.add(cellId);
          else next.delete(cellId);
          // Sync motifs sans confettis (le gagnant arrive via bingo-achieved)
          queueMicrotask(() => syncBingoFromChecked(next, data));
          return next;
        });
      });

      socket.on("members-updated", (members: { id: string; name: string }[]) => {
        setOnlineMembers(members);
      });

      socket.on("bingo-achieved", ({ userName }: { userName: string }) => {
        celebrateBingo(userName);
      });
    };

    initSocket();

    return () => {
      socketRef.current?.off("cell-updated");
      socketRef.current?.off("members-updated");
      socketRef.current?.off("bingo-achieved");
      if (hideBingoTimer.current) clearTimeout(hideBingoTimer.current);
    };
  }, [card, session, celebrateBingo, syncBingoFromChecked]);

  async function handleCellClick(cell: CellData) {
    if (!card) return;

    const centerPos = getCenterPosition(card.rows, card.cols);
    if (card.freeCenter && cell.position === centerPos) return;

    const isChecked = checkedCellIds.has(cell.id);
    const newChecked = !isChecked;

    const next = new Set(checkedCellIds);
    if (newChecked) next.add(cell.id);
    else next.delete(cell.id);

    // Case + confettis dans le même tick (pas d'attente useEffect)
    setCheckedCellIds(next);
    syncBingoFromChecked(next, card, {
      celebrateAs: newChecked ? session?.user?.name || "Toi" : undefined,
      broadcast: newChecked,
    });

    socketRef.current?.emit("check-cell", {
      cardId: card.id,
      cellId: cell.id,
      checked: newChecked,
    });

    await fetch(`/api/cards/${cardId}/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cellId: cell.id, checked: newChecked }),
    });
  }

  if (loading || !card) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-5xl text-ink-faint font-display text-lg">Chargement…</div>
      </div>
    );
  }

  const centerPos = getCenterPosition(card.rows, card.cols);
  const winningPositions = new Set(bingoPatterns.flatMap((p) => p.positions));
  const checkedCount = checkedCellIds.size;
  const totalCells = card.cells.length;
  const progress = Math.round((checkedCount / totalCells) * 100);

  return (
    <div className="min-h-screen">
      {showBingo && windowSize.width > 0 && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={320}
          gravity={0.2}
          initialVelocityY={30}
          tweenDuration={70}
          colors={["#0F9F93", "#F5C518", "#FFF4C2", "#C5F5EF", "#F59E0B", "#334155"]}
        />
      )}

      <AnimatePresence>
        {showBingo && (
          <motion.div
            initial={{ opacity: 0, y: -32, rotate: -1 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: "spring", stiffness: 380, damping: 24 }}
            className="fixed inset-x-0 top-0 z-50 flex items-center justify-center border-b border-spark-deep/30 bg-spark py-6 shadow-sm"
          >
            <div className="text-center text-ink">
              <motion.p
                className="font-display text-4xl font-bold tracking-tight sm:text-5xl"
                animate={{ rotate: [-1.5, 1.5, 0] }}
                transition={{ duration: 0.4 }}
              >
                BINGO!
              </motion.p>
              <p className="mt-1 text-base font-semibold text-ink-muted">
                {bingoWinner} a collé la ligne gagnante
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="sticky top-0 z-40 border-b border-paper-line bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={`/dashboard/teams/${card.team.id}`}
              className="shrink-0 text-sm font-bold text-accent hover:underline"
            >
              ← {card.team.name}
            </Link>
            <span className="text-paper-line">|</span>
            <h1 className="truncate font-display text-lg text-ink">{card.label}</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              {onlineMembers.slice(0, 4).map((m) => (
                <div
                  key={m.id}
                  title={m.name}
                  className="-ml-1 flex h-8 w-8 first:ml-0 items-center justify-center rounded-md border border-paper-line bg-white text-xs font-bold text-accent shadow-sm"
                >
                  {m.name?.[0]?.toUpperCase() || "?"}
                </div>
              ))}
              {onlineMembers.length > 4 && (
                <div className="-ml-1 flex h-8 w-8 items-center justify-center rounded-md border border-paper-line bg-paper-warm text-xs font-bold text-ink-faint">
                  +{onlineMembers.length - 4}
                </div>
              )}
              {onlineMembers.length > 0 && (
                <span className="ml-1 hidden text-xs font-bold text-accent sm:inline">
                  ● {onlineMembers.length} en ligne
                </span>
              )}
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <div className="h-2 w-24 overflow-hidden rounded-md bg-paper-line">
                <div
                  className="h-full rounded-md bg-gradient-to-r from-accent to-spark transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm font-bold text-accent">{progress}%</span>
            </div>
          </div>
        </div>
      </nav>

      {bingoPatterns.length > 0 && (
        <div className="mx-auto max-w-5xl px-4 pt-4">
          <div className="flex flex-wrap gap-2">
            {bingoPatterns.map((p, i) => (
              <span
                key={i}
                className="animate-pop rounded-md border border-spark-deep/20 bg-spark px-3 py-1 text-sm font-bold text-ink shadow-sm"
                style={{ transform: i % 2 === 0 ? "rotate(-1deg)" : "rotate(1deg)" }}
              >
                {p.type === "row"
                  ? `Ligne ${p.index + 1}`
                  : p.type === "column"
                    ? `Colonne ${p.index + 1}`
                    : p.index === 0
                      ? "Diag ↘"
                      : "Diag ↗"}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 py-6">
        <div
          className="mx-auto grid gap-2.5 sm:gap-3"
          style={{
            gridTemplateColumns: `repeat(${card.cols}, minmax(0, 1fr))`,
          }}
        >
          {card.cells.map((cell, index) => {
            const isChecked = checkedCellIds.has(cell.id);
            const isFree = card.freeCenter && cell.position === centerPos;
            const isWinning = winningPositions.has(cell.position);

            return (
              <BingoCell
                key={cell.id}
                cell={cell}
                isChecked={isChecked}
                isFree={isFree}
                isWinning={isWinning}
                onClick={() => handleCellClick(cell)}
                cols={card.cols}
                tilt={index % 3 === 0 ? -1.5 : index % 3 === 1 ? 1.2 : -0.6}
              />
            );
          })}
        </div>

        <div className="surface mt-8 flex items-center justify-between">
          <div className="flex gap-6 text-center">
            <div>
              <p className="font-display text-2xl text-accent">{checkedCount}</p>
              <p className="text-xs text-ink-faint">Cochées</p>
            </div>
            <div>
              <p className="font-display text-2xl text-ink-faint">{totalCells - checkedCount}</p>
              <p className="text-xs text-ink-faint">Restantes</p>
            </div>
            <div>
              <p className="font-display text-2xl text-spark-deep">{bingoPatterns.length}</p>
              <p className="text-xs text-ink-faint">Bingo{bingoPatterns.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <p className="text-xs text-ink-faint">
            Grille {card.rows}×{card.cols}
          </p>
        </div>
      </div>
    </div>
  );
}

function BingoCell({
  cell,
  isChecked,
  isFree,
  isWinning,
  onClick,
  cols,
  tilt,
}: {
  cell: CellData;
  isChecked: boolean;
  isFree: boolean;
  isWinning: boolean;
  onClick: () => void;
  cols: number;
  tilt: number;
}) {
  const fontSize = cols <= 4 ? "text-sm" : cols <= 6 ? "text-xs" : "text-[10px]";
  const emojiSize = cols <= 4 ? "text-2xl" : cols <= 6 ? "text-xl" : "text-base";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={isFree ? undefined : { rotate: tilt - 2, y: -3, scale: 1.02 }}
      whileTap={isFree ? undefined : { scale: 0.94, rotate: tilt + 3 }}
      animate={
        isChecked && !isFree
          ? { scale: [0.92, 1.06, 1], rotate: [tilt - 4, tilt + 2, tilt] }
          : { scale: 1, rotate: tilt }
      }
      transition={{ type: "spring", stiffness: 420, damping: 20 }}
      className={`
        sticky-note relative flex aspect-square flex-col items-center justify-center gap-1
        overflow-hidden rounded-sm border p-2 text-center
        ${
          isFree
            ? "cursor-default border-spark-deep/40 bg-spark text-ink shadow-[2px_3px_0_rgba(15,23,42,0.12)]"
            : isChecked
              ? isWinning
                ? "bingo-line border-accent-hover bg-accent text-white shadow-[2px_3px_0_rgba(11,127,118,0.35)]"
                : "border-accent/50 bg-accent-soft text-accent-hover shadow-[2px_3px_0_rgba(15,23,42,0.08)]"
              : isWinning
                ? "border-spark bg-spark-soft text-ink shadow-[2px_3px_0_rgba(212,160,23,0.25)]"
                : "border-paper-line bg-[#FFFEF8] text-ink shadow-[2px_3px_0_rgba(15,23,42,0.08)] hover:border-accent/40"
        }
      `}
    >
      {/* coin post-it */}
      <span
        aria-hidden
        className={`pointer-events-none absolute right-0 top-0 h-0 w-0 border-l-[14px] border-t-[14px] border-l-transparent ${
          isFree
            ? "border-t-spark-deep/30"
            : isChecked
              ? isWinning
                ? "border-t-black/10"
                : "border-t-accent/20"
              : "border-t-black/[0.06]"
        }`}
      />

      {isChecked && !isFree && (
        <span
          className={`pointer-events-none absolute inset-0 flex items-center justify-center font-display text-5xl ${
            isWinning ? "text-white/20" : "text-accent/20"
          }`}
        >
          ✓
        </span>
      )}

      {isFree ? (
        <>
          <span className={emojiSize}>★</span>
          <span className={`font-display font-bold ${fontSize}`}>FREE</span>
        </>
      ) : (
        <>
          {cell.phrase.emoji && <span className={emojiSize}>{cell.phrase.emoji}</span>}
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
              {cell.checked[0].user.name?.split(" ")[0] || "?"}
            </span>
          )}
        </>
      )}
    </motion.button>
  );
}
