"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { EMOJI_CATEGORIES } from "@/lib/phrase-emojis";

interface Phrase {
  id: string;
  text: string;
  emoji: string | null;
  isDefault: boolean;
}

export default function CreateCardPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const router = useRouter();

  const [label, setLabel] = useState(`Réunion du ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`);
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(5);
  const [freeCenter, setFreeCenter] = useState(true);
  const [defaults, setDefaults] = useState<Phrase[]>([]);
  const [custom, setCustom] = useState<Phrase[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newPhraseText, setNewPhraseText] = useState("");
  const [newPhraseEmoji, setNewPhraseEmoji] = useState("");
  const [editingPhraseId, setEditingPhraseId] = useState<string | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiCategoryId, setEmojiCategoryId] = useState(EMOJI_CATEGORIES[0].id);
  const [addingPhrase, setAddingPhrase] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const phraseFormRef = useRef<HTMLFormElement>(null);
  const activeEmojiCategory =
    EMOJI_CATEGORIES.find((category) => category.id === emojiCategoryId) ??
    EMOJI_CATEGORIES[0];

  const totalCells = rows * cols;
  const canHaveFreeCenter = rows % 2 !== 0 && cols % 2 !== 0;
  const centerPos = canHaveFreeCenter
    ? Math.floor(rows / 2) * cols + Math.floor(cols / 2)
    : null;
  const needed = freeCenter && centerPos !== null ? totalCells - 1 : totalCells;

  const fetchPhrases = useCallback(async () => {
    const res = await fetch(`/api/teams/${teamId}/phrases`);
    const data = await res.json();
    setDefaults(data.defaults || []);
    setCustom(data.custom || []);
  }, [teamId]);

  useEffect(() => {
    fetchPhrases();
  }, [fetchPhrases]);

  useEffect(() => {
    if (!emojiPickerOpen) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(target)) {
        setEmojiPickerOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setEmojiPickerOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [emojiPickerOpen]);

  function togglePhrase(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    const all = [...defaults, ...custom].map((p) => p.id);
    setSelectedIds(new Set(all));
  }

  function selectNone() {
    setSelectedIds(new Set());
  }

  function resetPhraseForm() {
    setEditingPhraseId(null);
    setNewPhraseText("");
    setNewPhraseEmoji("");
    setEmojiPickerOpen(false);
  }

  function startEditPhrase(phrase: Phrase) {
    setEditingPhraseId(phrase.id);
    setNewPhraseText(phrase.text);
    setNewPhraseEmoji(phrase.emoji ?? "");
    setEmojiPickerOpen(false);
    setError("");
    phraseFormRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function savePhrase(e: React.FormEvent) {
    e.preventDefault();
    if (!newPhraseText.trim()) return;
    setAddingPhrase(true);
    setError("");
    const trimmedEmoji = newPhraseEmoji.trim();

    if (editingPhraseId) {
      const res = await fetch(`/api/teams/${teamId}/phrases`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phraseId: editingPhraseId,
          text: newPhraseText.trim(),
          emoji: trimmedEmoji || null,
        }),
      });
      if (res.ok) {
        const phrase = await res.json();
        setCustom((prev) => prev.map((p) => (p.id === phrase.id ? phrase : p)));
        resetPhraseForm();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Impossible de modifier la phrase");
      }
      setAddingPhrase(false);
      return;
    }

    const res = await fetch(`/api/teams/${teamId}/phrases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: newPhraseText.trim(),
        ...(trimmedEmoji ? { emoji: trimmedEmoji } : {}),
      }),
    });
    if (res.ok) {
      const phrase = await res.json();
      setCustom((prev) => [phrase, ...prev]);
      setSelectedIds((prev) => new Set(Array.from(prev).concat(phrase.id)));
      resetPhraseForm();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Impossible d'ajouter la phrase");
    }
    setAddingPhrase(false);
  }

  async function deletePhrase(phrase: Phrase) {
    if (
      !confirm(
        `Supprimer la phrase « ${phrase.text} » ? Cette action est définitive.`
      )
    ) {
      return;
    }
    setError("");
    const res = await fetch(`/api/teams/${teamId}/phrases`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phraseId: phrase.id }),
    });
    if (res.ok) {
      setCustom((prev) => prev.filter((p) => p.id !== phrase.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(phrase.id);
        return next;
      });
      if (editingPhraseId === phrase.id) resetPhraseForm();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Impossible de supprimer la phrase");
    }
  }

  async function createCard() {
    setError("");
    if (selectedIds.size < needed) {
      setError(`Sélectionne au moins ${needed} phrases pour remplir la grille ${rows}×${cols}`);
      return;
    }
    setCreating(true);
    const res = await fetch(`/api/teams/${teamId}/cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label,
        rows,
        cols,
        freeCenter: freeCenter && centerPos !== null,
        phraseIds: Array.from(selectedIds),
      }),
    });
    setCreating(false);
    if (res.ok) {
      const card = await res.json();
      router.push(`/play/${card.id}`);
    } else {
      const d = await res.json();
      setError(d.error);
    }
  }

  const allPhrases = [...custom, ...defaults];

  return (
    <div>
      <div className="mb-8">
        <Link
          href={`/dashboard/teams/${teamId}`}
          className="text-sm text-accent font-bold hover:underline mb-2 inline-block"
        >
          ← Retour à l&apos;équipe
        </Link>
        <h1 className="font-display text-4xl font-semibold text-ink">Nouvelle grille<span className="text-accent">.</span></h1>
        <p className="mt-1 text-ink-faint">Compose ta grille post-it pour cette semaine</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Config column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Card settings */}
          <div className="surface">
            <h2 className="mb-4 font-display text-xl text-ink">Configuration</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-ink-muted mb-1">Nom de la grille</label>
                <input
                  className="input"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ex: Réunion du lundi"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-ink-muted mb-1">Lignes</label>
                  <input
                    type="number"
                    className="input text-center"
                    min={2}
                    max={10}
                    value={rows}
                    onChange={(e) => setRows(Math.max(2, Math.min(10, parseInt(e.target.value) || 2)))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-ink-muted mb-1">Colonnes</label>
                  <input
                    type="number"
                    className="input text-center"
                    min={2}
                    max={10}
                    value={cols}
                    onChange={(e) => setCols(Math.max(2, Math.min(10, parseInt(e.target.value) || 2)))}
                  />
                </div>
              </div>

              {canHaveFreeCenter && (
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                      freeCenter
                        ? "bg-accent border-accent"
                        : "border-gray-300 group-hover:border-accent"
                    }`}
                    onClick={() => setFreeCenter(!freeCenter)}
                  >
                    {freeCenter && <span className="text-white text-xs">✓</span>}
                  </div>
                  <span className="text-sm font-semibold text-ink">Case centrale FREE ⭐</span>
                </label>
              )}
            </div>

            {/* Grid preview */}
            <div className="mt-4 p-3 bg-accent-mist rounded-md">
              <p className="text-xs font-bold text-accent mb-2 text-center">Aperçu de la grille</p>
              <div
                className="grid gap-1 mx-auto"
                style={{
                  gridTemplateColumns: `repeat(${cols}, 1fr)`,
                  maxWidth: `${cols * 28}px`,
                }}
              >
                {Array.from({ length: totalCells }).map((_, i) => (
                  <div
                    key={i}
                    className={`aspect-square rounded flex items-center justify-center text-xs font-bold ${
                      freeCenter && centerPos !== null && i === centerPos
                        ? "bg-yellow-300 text-yellow-800"
                        : "bg-accent/20 text-accent"
                    }`}
                  >
                    {freeCenter && centerPos !== null && i === centerPos ? "★" : ""}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="surface-spark">
            <h2 className="mb-3 font-display text-lg text-ink">Résumé</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-faint">Taille</span>
                <span className="font-bold text-ink">{rows} × {cols} = {totalCells} cases</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-faint">Phrases nécessaires</span>
                <span className="font-bold text-ink">{needed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-faint">Phrases sélectionnées</span>
                <span className={`font-bold ${selectedIds.size >= needed ? "text-green-600" : "text-red-500"}`}>
                  {selectedIds.size} / {needed}
                </span>
              </div>
            </div>

            {error && (
              <div className="mt-3 text-red-500 text-sm font-semibold bg-red-50 rounded-xl p-3">
                ❌ {error}
              </div>
            )}

            <button
              onClick={createCard}
              className="btn-primary w-full mt-4"
              disabled={creating || selectedIds.size < needed}
            >
              {creating ? "Génération..." : `Générer la grille (${selectedIds.size}/${needed})`}
            </button>
          </div>
        </div>

        {/* Phrase bank column */}
        <div className="lg:col-span-2">
          <div className="surface">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display text-accent">💬 Banque de phrases</h2>
              <div className="flex gap-2 text-sm">
                <button onClick={selectAll} className="text-accent font-bold hover:underline">
                  Tout sélectionner
                </button>
                <span className="text-paper-line">|</span>
                <button onClick={selectNone} className="text-ink-faint font-bold hover:underline">
                  Tout désélectionner
                </button>
              </div>
            </div>

            {/* Add / edit custom phrase */}
            <form ref={phraseFormRef} onSubmit={savePhrase} className="mb-6 space-y-2">
              {editingPhraseId && (
                <p className="text-xs font-bold text-accent">
                  Modification d&apos;une phrase personnalisée
                </p>
              )}
              <div className="flex gap-2">
              <div className="relative" ref={emojiPickerRef}>
                <button
                  type="button"
                  className="input flex-none w-12 px-0 flex items-center justify-center text-xl hover:border-accent"
                  aria-label="Choisir un emoji"
                  aria-expanded={emojiPickerOpen}
                  onClick={() => setEmojiPickerOpen((open) => !open)}
                >
                  {newPhraseEmoji || "😄"}
                </button>

                <AnimatePresence>
                  {emojiPickerOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-full z-20 mt-2 w-80 rounded-sm border border-paper-line bg-note p-3 shadow-[3px_4px_0_rgba(15,23,42,0.12)] sm:w-96"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">
                          Choisir un emoji
                        </p>
                        {newPhraseEmoji && (
                          <button
                            type="button"
                            className="text-xs font-bold text-ink-faint hover:text-accent"
                            onClick={() => {
                              setNewPhraseEmoji("");
                              setEmojiPickerOpen(false);
                            }}
                          >
                            Effacer
                          </button>
                        )}
                      </div>

                      <div className="mb-2 flex gap-1 overflow-x-auto pb-1">
                        {EMOJI_CATEGORIES.map((category) => (
                          <button
                            key={category.id}
                            type="button"
                            title={category.label}
                            aria-label={category.label}
                            aria-pressed={category.id === activeEmojiCategory.id}
                            className={`flex h-8 w-8 flex-none items-center justify-center rounded-sm text-base transition-colors ${
                              category.id === activeEmojiCategory.id
                                ? "bg-accent-soft ring-1 ring-accent/40"
                                : "hover:bg-accent-mist"
                            }`}
                            onClick={() => setEmojiCategoryId(category.id)}
                          >
                            {category.icon}
                          </button>
                        ))}
                      </div>

                      <p className="mb-2 text-xs font-bold text-ink-faint">
                        {activeEmojiCategory.label}
                      </p>

                      <div className="grid max-h-56 grid-cols-8 gap-1 overflow-y-auto pr-1">
                        {activeEmojiCategory.emojis.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className={`flex aspect-square items-center justify-center rounded-sm text-lg transition-colors hover:bg-accent-mist ${
                              newPhraseEmoji === emoji
                                ? "bg-accent-soft ring-1 ring-accent/40"
                                : ""
                            }`}
                            onClick={() => {
                              setNewPhraseEmoji(emoji);
                              setEmojiPickerOpen(false);
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <input
                className="input flex-1"
                placeholder={
                  editingPhraseId
                    ? "Modifier la phrase..."
                    : "Ajouter une phrase personnalisée..."
                }
                value={newPhraseText}
                onChange={(e) => setNewPhraseText(e.target.value)}
              />
              <button
                type="submit"
                className="btn-primary py-2 px-4"
                disabled={addingPhrase || !newPhraseText.trim()}
              >
                {addingPhrase
                  ? "..."
                  : editingPhraseId
                    ? "Enregistrer"
                    : "+ Ajouter"}
              </button>
              {editingPhraseId && (
                <button
                  type="button"
                  className="btn-secondary py-2 px-3"
                  onClick={resetPhraseForm}
                  disabled={addingPhrase}
                >
                  Annuler
                </button>
              )}              </div>
            </form>

            {/* Custom phrases */}
            {custom.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-bold text-ink-faint uppercase tracking-wide mb-2">
                  Phrases personnalisées ({custom.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  <AnimatePresence>
                    {custom.map((phrase) => (
                      <PhraseChip
                        key={phrase.id}
                        phrase={phrase}
                        selected={selectedIds.has(phrase.id)}
                        editing={editingPhraseId === phrase.id}
                        onClick={() => togglePhrase(phrase.id)}
                        onEdit={() => startEditPhrase(phrase)}
                        onDelete={() => deletePhrase(phrase)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Default phrases */}
            <div>
              <p className="text-xs font-bold text-ink-faint uppercase tracking-wide mb-2">
                Phrases classiques ({defaults.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {allPhrases.filter((p) => p.isDefault).map((phrase) => (
                  <PhraseChip
                    key={phrase.id}
                    phrase={phrase}
                    selected={selectedIds.has(phrase.id)}
                    onClick={() => togglePhrase(phrase.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhraseChip({
  phrase,
  selected,
  editing,
  onClick,
  onEdit,
  onDelete,
}: {
  phrase: Phrase;
  selected: boolean;
  editing?: boolean;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const isEditable = Boolean(onEdit || onDelete);

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
        whileHover={{ y: selected || editing ? 0 : -1 }}
        onClick={onClick}
        className={`rounded-sm px-3 py-1.5 text-sm font-semibold transition-colors ${
          selected || editing ? "text-accent-hover" : "text-ink-muted hover:text-ink"
        }`}
      >
        {phrase.emoji && <span className="mr-1">{phrase.emoji}</span>}
        {phrase.text}
      </motion.button>

      {isEditable && (
        <div className="flex items-center gap-0.5 pr-1">
          {onEdit && (
            <button
              type="button"
              title="Modifier"
              aria-label={`Modifier « ${phrase.text} »`}
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="flex h-6 w-6 items-center justify-center rounded-sm text-xs font-bold text-ink-faint transition-colors hover:bg-white/70 hover:text-accent"
            >
              ✎
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              title="Supprimer"
              aria-label={`Supprimer « ${phrase.text} »`}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
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
