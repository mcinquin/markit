"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import type { Socket } from "socket.io-client";
import { apiRequest } from "@/lib/api-client";
import { getFreeCenterPosition, getPatternMessage } from "@/lib/bingo";
import type { PlayCard, PlayCell } from "@/lib/data";
import type { CellUpdatedEvent } from "@/lib/realtime";
import { BingoCell } from "./bingo-cell";
import { getCardPatterns, getCheckedCellIds, setCellChecked } from "./card-state";
import { useWindowSize } from "./use-window-size";

const Confetti = dynamic(() => import("react-confetti"), { ssr: false });

const CELEBRATION_MS = 4500;
const FALLBACK_POLL_MS = 3000;
const MAX_VISIBLE_MEMBERS = 4;
const CONFETTI_COLORS = ["#0F9F93", "#F5C518", "#FFF4C2", "#C5F5EF", "#F59E0B", "#334155"];

type OnlineMember = { id: string; name: string };

type Props = {
  initialCard: PlayCard;
  currentUser: { id: string; name: string | null };
};

/** Écran de jeu temps réel (Socket.io + polling de secours si le WebSocket tombe). */
export function PlayClient({ initialCard, currentUser }: Props) {
  const t = useTranslations("play");
  const tApi = useTranslations("apiClient");
  const cardId = initialCard.id;
  const [card, setCard] = useState(initialCard);
  const [showBingo, setShowBingo] = useState(false);
  const [bingoWinner, setBingoWinner] = useState<string | null>(null);
  const [onlineMembers, setOnlineMembers] = useState<OnlineMember[]>([]);
  const [error, setError] = useState("");
  const windowSize = useWindowSize();
  const socketRef = useRef<Socket | null>(null);
  const hideBingoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const freeCenterPos = getFreeCenterPosition(card);
  const checkedCellIds = useMemo(() => getCheckedCellIds(card), [card]);
  const bingoPatterns = useMemo(() => getCardPatterns(card), [card]);

  const celebrateBingo = useCallback((userName: string) => {
    if (hideBingoTimer.current) return;
    setBingoWinner(userName);
    setShowBingo(true);
    hideBingoTimer.current = setTimeout(() => {
      setShowBingo(false);
      hideBingoTimer.current = null;
    }, CELEBRATION_MS);
  }, []);

  const refreshCard = useCallback(async () => {
    const result = await apiRequest<PlayCard>(`/api/cards/${cardId}`);
    if (result.ok) setCard(result.data);
  }, [cardId]);

  useEffect(() => {
    let cancelled = false;
    let socket: Socket | null = null;

    const joinRoom = () => socket?.emit("join-card", { cardId });

    const onCellUpdated = ({ cellId, checked, userName }: CellUpdatedEvent) => {
      setCard((prev) => setCellChecked(prev, cellId, checked ? { name: userName } : null));
    };
    const onBingoAchieved = ({ userName }: { userName: string }) => celebrateBingo(userName);

    void import("@/lib/socket").then(({ getSocket }) => {
      if (cancelled) return;
      socket = getSocket();
      socketRef.current = socket;

      socket.on("connect", joinRoom);
      socket.on("cell-updated", onCellUpdated);
      socket.on("members-updated", setOnlineMembers);
      socket.on("bingo-achieved", onBingoAchieved);

      // Singleton déjà connecté : rejoindre immédiatement
      if (socket.connected) joinRoom();
      else socket.connect();
    });

    const pollTimer = setInterval(() => {
      if (document.visibilityState === "hidden" || socketRef.current?.connected) return;
      void refreshCard();
    }, FALLBACK_POLL_MS);

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (socketRef.current?.connected) joinRoom();
      else void refreshCard();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(pollTimer);
      document.removeEventListener("visibilitychange", onVisible);
      if (socket) {
        socket.emit("leave-card", { cardId });
        socket.off("connect", joinRoom);
        socket.off("cell-updated", onCellUpdated);
        socket.off("members-updated", setOnlineMembers);
        socket.off("bingo-achieved", onBingoAchieved);
      }
      socketRef.current = null;
      if (hideBingoTimer.current) clearTimeout(hideBingoTimer.current);
      hideBingoTimer.current = null;
    };
  }, [cardId, celebrateBingo, refreshCard]);

  async function handleCellClick(cell: PlayCell) {
    if (cell.position === freeCenterPos) return;

    const isNowChecked = !checkedCellIds.has(cell.id);
    const nextCard = setCellChecked(
      card,
      cell.id,
      isNowChecked ? { userId: currentUser.id, name: currentUser.name } : null
    );
    setCard(nextCard);
    setError("");

    // Confettis dans le même tick que le clic ; les autres joueurs sont prévenus via le socket
    if (isNowChecked && getCardPatterns(nextCard).length > bingoPatterns.length) {
      celebrateBingo(currentUser.name || t("you"));
      socketRef.current?.emit("bingo", { cardId });
    }

    const result = await apiRequest(`/api/cards/${cardId}/check`, {
      method: "POST",
      json: { cellId: cell.id, checked: isNowChecked },
      fallbackError: t("saveFailed"),
      networkError: tApi("network"),
    });
    if (!result.ok) {
      setError(result.error);
      void refreshCard();
    }
  }

  const winningPositions = new Set(bingoPatterns.flatMap((p) => p.positions));
  const checkedCount = checkedCellIds.size;
  const totalCells = card.cells.length;
  const progress = totalCells ? Math.round((checkedCount / totalCells) * 100) : 0;

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
          colors={CONFETTI_COLORS}
        />
      )}

      <AnimatePresence>
        {showBingo && (
          <motion.div
            role="status"
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
                {t("bingo")}
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
            <span aria-hidden className="text-paper-line">
              |
            </span>
            <h1 className="truncate font-display text-lg text-ink">{card.label}</h1>
          </div>

          <div className="flex items-center gap-4">
            <OnlineMembers members={onlineMembers} onlineLabel={t("online", { count: onlineMembers.length })} />

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
            {bingoPatterns.map((pattern, i) => {
              const msg = getPatternMessage(pattern);
              return (
                <span
                  key={`${pattern.type}-${pattern.index}`}
                  className="animate-pop rounded-md border border-spark-deep/20 bg-spark px-3 py-1 text-sm font-bold text-ink shadow-sm"
                  style={{ transform: i % 2 === 0 ? "rotate(-1deg)" : "rotate(1deg)" }}
                >
                  {t(`patterns.${msg.key}`, { n: msg.n })}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 py-6">
        {error && (
          <p role="alert" className="mb-4 text-sm font-semibold text-danger">
            {error}
          </p>
        )}

        <div
          className="mx-auto grid gap-2.5 sm:gap-3"
          style={{ gridTemplateColumns: `repeat(${card.cols}, minmax(0, 1fr))` }}
        >
          {card.cells.map((cell, index) => (
            <BingoCell
              key={cell.id}
              cell={cell}
              isChecked={checkedCellIds.has(cell.id)}
              isFree={cell.position === freeCenterPos}
              isWinning={winningPositions.has(cell.position)}
              onClick={() => void handleCellClick(cell)}
              cols={card.cols}
              tilt={index % 3 === 0 ? -1.5 : index % 3 === 1 ? 1.2 : -0.6}
            />
          ))}
        </div>

        <div className="surface mt-8 flex items-center justify-between">
          <div className="flex gap-6 text-center">
            <Stat value={checkedCount} label={t("checked")} className="text-accent" />
            <Stat value={totalCells - checkedCount} label={t("remaining")} className="text-ink-faint" />
            <Stat
              value={bingoPatterns.length}
              label={t("bingos", { count: bingoPatterns.length })}
              className="text-spark-deep"
            />
          </div>
          <p className="text-xs text-ink-faint">
            {t("gridSize", { rows: card.rows, cols: card.cols })}
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label, className }: { value: number; label: string; className: string }) {
  return (
    <div>
      <p className={`font-display text-2xl ${className}`}>{value}</p>
      <p className="text-xs text-ink-faint">{label}</p>
    </div>
  );
}

function OnlineMembers({ members, onlineLabel }: { members: OnlineMember[]; onlineLabel: string }) {
  const hiddenCount = members.length - MAX_VISIBLE_MEMBERS;

  return (
    <div className="flex items-center gap-1">
      {members.slice(0, MAX_VISIBLE_MEMBERS).map((member) => (
        <div
          key={member.id}
          title={member.name}
          className="-ml-1 flex h-8 w-8 first:ml-0 items-center justify-center rounded-md border border-paper-line bg-white text-xs font-bold text-accent shadow-sm"
        >
          {member.name?.[0]?.toUpperCase() || "?"}
        </div>
      ))}
      {hiddenCount > 0 && (
        <div className="-ml-1 flex h-8 w-8 items-center justify-center rounded-md border border-paper-line bg-paper-warm text-xs font-bold text-ink-faint">
          +{hiddenCount}
        </div>
      )}
      {members.length > 0 && (
        <span className="ml-1 hidden text-xs font-bold text-accent sm:inline">
          {onlineLabel}
        </span>
      )}
    </div>
  );
}
