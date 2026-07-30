"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

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
  const [addingPhrase, setAddingPhrase] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const totalCells = rows * cols;
  const centerPos = freeCenter && rows % 2 !== 0 && cols % 2 !== 0
    ? Math.floor(rows / 2) * cols + Math.floor(cols / 2)
    : null;
  const needed = centerPos !== null ? totalCells - 1 : totalCells;

  const fetchPhrases = useCallback(async () => {
    const res = await fetch(`/api/teams/${teamId}/phrases`);
    const data = await res.json();
    setDefaults(data.defaults || []);
    setCustom(data.custom || []);
  }, [teamId]);

  useEffect(() => {
    fetchPhrases();
  }, [fetchPhrases]);

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

  async function addPhrase(e: React.FormEvent) {
    e.preventDefault();
    if (!newPhraseText.trim()) return;
    setAddingPhrase(true);
    const res = await fetch(`/api/teams/${teamId}/phrases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newPhraseText.trim(), emoji: newPhraseEmoji.trim() || null }),
    });
    if (res.ok) {
      const phrase = await res.json();
      setCustom((prev) => [phrase, ...prev]);
      setSelectedIds((prev) => new Set(Array.from(prev).concat(phrase.id)));
      setNewPhraseText("");
      setNewPhraseEmoji("");
    }
    setAddingPhrase(false);
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
        freeCenter: centerPos !== null ? freeCenter : false,
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

              {centerPos !== null && (
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
                      centerPos !== null && i === centerPos && freeCenter
                        ? "bg-yellow-300 text-yellow-800"
                        : "bg-accent/20 text-accent"
                    }`}
                  >
                    {centerPos !== null && i === centerPos && freeCenter ? "★" : ""}
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

            {/* Add custom phrase */}
            <form onSubmit={addPhrase} className="flex gap-2 mb-6">
              <input
                className="input flex-none w-12 text-center px-2"
                placeholder="😄"
                value={newPhraseEmoji}
                onChange={(e) => setNewPhraseEmoji(e.target.value)}
                maxLength={2}
              />
              <input
                className="input flex-1"
                placeholder="Ajouter une phrase personnalisée..."
                value={newPhraseText}
                onChange={(e) => setNewPhraseText(e.target.value)}
              />
              <button type="submit" className="btn-primary py-2 px-4" disabled={addingPhrase || !newPhraseText.trim()}>
                + Ajouter
              </button>
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
                        onClick={() => togglePhrase(phrase.id)}
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
  onClick,
}: {
  phrase: Phrase;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ rotate: selected ? 0 : -2, y: -2 }}
      onClick={onClick}
      className={`rounded-sm border px-3 py-1.5 text-sm font-semibold transition-colors shadow-[1px_2px_0_rgba(15,23,42,0.08)] ${
        selected
          ? "border-accent/40 bg-accent-soft text-accent-hover"
          : "border-paper-line bg-note text-ink-muted hover:border-accent/40"
      }`}
    >
      {phrase.emoji && <span className="mr-1">{phrase.emoji}</span>}
      {phrase.text}
    </motion.button>
  );
}
