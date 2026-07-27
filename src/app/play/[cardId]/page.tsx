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

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    const handler = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const fetchCard = useCallback(async () => {
    const res = await fetch(`/api/cards/${cardId}`);
    if (!res.ok) return;
    const data: CardData = await res.json();
    setCard(data);

    const checked = new Set(
      data.cells
        .filter((c) => c.checked.length > 0)
        .map((c) => c.id)
    );
    setCheckedCellIds(checked);

    // Detect initial bingo patterns
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

  // Socket.io connection
  useEffect(() => {
    if (!card || !session) return;

    const initSocket = async () => {
      const { getSocket } = await import("@/lib/socket");
      const socket = getSocket();
      socketRef.current = socket;

      // Le userName est résolu côté serveur depuis le JWT — on n'envoie pas de données non fiables
      socket.emit("join-card", { cardId: card.id });

      socket.on("cell-updated", ({ cellId, checked }: { cellId: string; checked: boolean; userName: string }) => {
        setCheckedCellIds((prev) => {
          const next = new Set(prev);
          if (checked) next.add(cellId);
          else next.delete(cellId);
          return next;
        });
      });

      socket.on("members-updated", (members: { id: string; name: string }[]) => {
        setOnlineMembers(members);
      });

      socket.on("bingo-achieved", ({ userName }: { userName: string }) => {
        setBingoWinner(userName);
        setShowBingo(true);
        setTimeout(() => setShowBingo(false), 5000);
      });
    };

    initSocket();

    return () => {
      socketRef.current?.off("cell-updated");
      socketRef.current?.off("members-updated");
      socketRef.current?.off("bingo-achieved");
    };
  }, [card, session]);

  // Detect bingo when checked cells change
  useEffect(() => {
    if (!card) return;

    const positions = new Set<number>();
    card.cells.forEach((cell) => {
      if (checkedCellIds.has(cell.id)) positions.add(cell.position);
    });

    const patterns = detectBingo(positions, card.rows, card.cols);
    setBingoPatterns(patterns);

    if (patterns.length > prevBingoCount.current) {
      setShowBingo(true);
      setBingoWinner(session?.user?.name || "Toi");
      setTimeout(() => setShowBingo(false), 5000);

      // Notify others
      socketRef.current?.emit("bingo", {
        cardId: card.id,
        pattern: patterns[patterns.length - 1],
      });
    }
    prevBingoCount.current = patterns.length;
  }, [checkedCellIds, card, session]);

  async function handleCellClick(cell: CellData) {
    if (!card) return;

    const centerPos = getCenterPosition(card.rows, card.cols);
    if (card.freeCenter && cell.position === centerPos) return;

    const isChecked = checkedCellIds.has(cell.id);
    const newChecked = !isChecked;

    // Optimistic update
    setCheckedCellIds((prev) => {
      const next = new Set(prev);
      if (newChecked) next.add(cell.id);
      else next.delete(cell.id);
      return next;
    });

    // Notify via socket immediately
    socketRef.current?.emit("check-cell", {
      cardId: card.id,
      cellId: cell.id,
      checked: newChecked,
    });

    // Persist to DB
    await fetch(`/api/cards/${cardId}/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cellId: cell.id, checked: newChecked }),
    });
  }

  if (loading || !card) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-5xl animate-bounce">🎰</div>
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
      {/* Confetti on bingo */}
      {showBingo && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={300}
          colors={["#FF6B9D", "#9B59B6", "#3498DB", "#2ECC71", "#F1C40F", "#E67E22"]}
        />
      )}

      {/* Bingo celebration banner */}
      <AnimatePresence>
        {showBingo && (
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center py-6 bg-gradient-to-r from-bingo-pink via-bingo-purple to-bingo-blue shadow-2xl"
          >
            <div className="text-center text-white">
              <p className="text-5xl font-display animate-bounce">🎉 BINGO ! 🎉</p>
              <p className="text-xl font-semibold mt-1 opacity-90">{bingoWinner} a décroché le bingo !</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-purple-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/teams/${card.team.id}`} className="text-sm text-bingo-purple font-bold hover:underline">
              ← {card.team.name}
            </Link>
            <span className="text-gray-300">|</span>
            <h1 className="font-display text-lg text-gray-700">{card.label}</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Online members */}
            <div className="flex items-center gap-1">
              {onlineMembers.slice(0, 4).map((m) => (
                <div
                  key={m.id}
                  title={m.name}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-bingo-pink to-bingo-purple flex items-center justify-center text-white text-xs font-bold border-2 border-white -ml-1 first:ml-0"
                >
                  {m.name?.[0]?.toUpperCase() || "?"}
                </div>
              ))}
              {onlineMembers.length > 4 && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold border-2 border-white -ml-1">
                  +{onlineMembers.length - 4}
                </div>
              )}
              {onlineMembers.length > 0 && (
                <span className="text-xs text-green-600 font-bold ml-1">
                  ● {onlineMembers.length} en ligne
                </span>
              )}
            </div>

            {/* Progress */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-24 h-2 bg-purple-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-bingo-pink to-bingo-purple rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm font-bold text-bingo-purple">{progress}%</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Bingo status chips */}
      {bingoPatterns.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 pt-4">
          <div className="flex gap-2 flex-wrap">
            {bingoPatterns.map((p, i) => (
              <span
                key={i}
                className="bg-gradient-to-r from-bingo-pink to-bingo-purple text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-md animate-pop"
              >
                🎉 BINGO {p.type === "row" ? `Ligne ${p.index + 1}` : p.type === "column" ? `Colonne ${p.index + 1}` : p.index === 0 ? "Diagonale ↘" : "Diagonale ↗"}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div
          className="grid gap-2 sm:gap-3 mx-auto"
          style={{
            gridTemplateColumns: `repeat(${card.cols}, minmax(0, 1fr))`,
          }}
        >
          {card.cells.map((cell) => {
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
              />
            );
          })}
        </div>

        {/* Stats bar */}
        <div className="mt-8 card flex items-center justify-between">
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-2xl font-display text-bingo-purple">{checkedCount}</p>
              <p className="text-xs text-gray-400">Cochées</p>
            </div>
            <div>
              <p className="text-2xl font-display text-gray-400">{totalCells - checkedCount}</p>
              <p className="text-xs text-gray-400">Restantes</p>
            </div>
            <div>
              <p className="text-2xl font-display text-bingo-pink">{bingoPatterns.length}</p>
              <p className="text-xs text-gray-400">Bingo{bingoPatterns.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">
              Grille {card.rows}×{card.cols}
            </p>
          </div>
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
}: {
  cell: CellData;
  isChecked: boolean;
  isFree: boolean;
  isWinning: boolean;
  onClick: () => void;
  cols: number;
}) {
  const fontSize = cols <= 4 ? "text-sm" : cols <= 6 ? "text-xs" : "text-[10px]";
  const emojiSize = cols <= 4 ? "text-2xl" : cols <= 6 ? "text-xl" : "text-base";

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      className={`
        relative aspect-square rounded-2xl border-2 transition-all duration-200 p-2
        flex flex-col items-center justify-center text-center gap-1 overflow-hidden
        ${isFree
          ? "bg-gradient-to-br from-yellow-200 to-yellow-300 border-yellow-400 cursor-default"
          : isChecked
          ? isWinning
            ? "bg-gradient-to-br from-bingo-pink to-bingo-purple border-bingo-purple shadow-lg shadow-purple-300/50 scale-105"
            : "bg-gradient-to-br from-bingo-purple/80 to-bingo-blue/80 border-bingo-purple shadow-md"
          : isWinning
          ? "bg-yellow-50 border-bingo-yellow"
          : "bg-white border-gray-200 hover:border-bingo-purple/40 hover:shadow-md hover:bg-purple-50"
        }
      `}
    >
      {/* Checked overlay */}
      {isChecked && !isFree && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <span className="text-white font-display" style={{ fontSize: "3rem" }}>✓</span>
          </div>
        </motion.div>
      )}

      {isFree ? (
        <>
          <span className={emojiSize}>⭐</span>
          <span className={`font-display font-bold text-yellow-700 ${fontSize}`}>FREE</span>
        </>
      ) : (
        <>
          {cell.phrase.emoji && (
            <span className={emojiSize}>{cell.phrase.emoji}</span>
          )}
          <span
            className={`font-semibold leading-tight ${fontSize} ${
              isChecked ? "text-white" : "text-gray-700"
            }`}
          >
            {cell.phrase.text}
          </span>
          {isChecked && cell.checked[0] && (
            <span className={`text-white/70 ${cols <= 4 ? "text-xs" : "text-[8px]"} leading-none`}>
              ✓ {cell.checked[0].user.name?.split(" ")[0] || "?"}
            </span>
          )}
        </>
      )}
    </motion.button>
  );
}
