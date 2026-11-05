"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/api-client";
import { getCenterPosition } from "@/lib/bingo";
import type { TeamPhrase } from "@/lib/data";
import { EmojiPicker } from "./emoji-picker";
import { GridSizeInput } from "./grid-size-input";
import { PhraseChip } from "./phrase-chip";

type Props = {
  teamId: string;
  initialDefaults: TeamPhrase[];
  initialCustom: TeamPhrase[];
};

function defaultCardLabel() {
  return `Réunion du ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;
}

/** Configuration d'une nouvelle grille et gestion de la banque de phrases de l'équipe. */
export function CreateCardClient({ teamId, initialDefaults, initialCustom }: Props) {
  const router = useRouter();
  const labelId = useId();
  const phraseInputId = useId();

  const [label, setLabel] = useState(defaultCardLabel);
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(5);
  const [freeCenter, setFreeCenter] = useState(true);
  const defaults = initialDefaults;
  const [custom, setCustom] = useState(initialCustom);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newPhraseText, setNewPhraseText] = useState("");
  const [newPhraseEmoji, setNewPhraseEmoji] = useState("");
  const [editingPhraseId, setEditingPhraseId] = useState<string | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [savingPhrase, setSavingPhrase] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const phraseFormRef = useRef<HTMLFormElement>(null);

  const totalCells = rows * cols;
  const centerPos = getCenterPosition(rows, cols);
  const hasFreeCenter = freeCenter && centerPos !== null;
  const needed = hasFreeCenter ? totalCells - 1 : totalCells;
  const phrasesUrl = `/api/teams/${teamId}/phrases`;

  function togglePhrase(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resetPhraseForm() {
    setEditingPhraseId(null);
    setNewPhraseText("");
    setNewPhraseEmoji("");
    setEmojiPickerOpen(false);
  }

  function startEditPhrase(phrase: TeamPhrase) {
    setEditingPhraseId(phrase.id);
    setNewPhraseText(phrase.text);
    setNewPhraseEmoji(phrase.emoji ?? "");
    setEmojiPickerOpen(false);
    setError("");
    phraseFormRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function savePhrase(e: React.FormEvent) {
    e.preventDefault();
    const text = newPhraseText.trim();
    if (!text) return;
    setSavingPhrase(true);
    setError("");
    const emoji = newPhraseEmoji.trim() || null;

    if (editingPhraseId) {
      const result = await apiRequest<TeamPhrase>(phrasesUrl, {
        method: "PATCH",
        json: { phraseId: editingPhraseId, text, emoji },
        fallbackError: "Impossible de modifier la phrase",
      });
      if (result.ok) {
        setCustom((prev) => prev.map((p) => (p.id === result.data.id ? result.data : p)));
        resetPhraseForm();
      } else {
        setError(result.error);
      }
    } else {
      const result = await apiRequest<TeamPhrase>(phrasesUrl, {
        method: "POST",
        json: { text, emoji },
        fallbackError: "Impossible d'ajouter la phrase",
      });
      if (result.ok) {
        setCustom((prev) => [result.data, ...prev]);
        setSelectedIds((prev) => new Set(prev).add(result.data.id));
        resetPhraseForm();
      } else {
        setError(result.error);
      }
    }
    setSavingPhrase(false);
  }

  async function deletePhrase(phrase: TeamPhrase) {
    if (!confirm(`Supprimer la phrase « ${phrase.text} » ? Cette action est définitive.`)) {
      return;
    }
    setError("");
    const result = await apiRequest(phrasesUrl, {
      method: "DELETE",
      json: { phraseId: phrase.id },
      fallbackError: "Impossible de supprimer la phrase",
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCustom((prev) => prev.filter((p) => p.id !== phrase.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(phrase.id);
      return next;
    });
    if (editingPhraseId === phrase.id) resetPhraseForm();
  }

  async function createCard() {
    setError("");
    if (selectedIds.size < needed) {
      setError(`Sélectionne au moins ${needed} phrases pour remplir la grille ${rows}×${cols}`);
      return;
    }
    setCreating(true);
    const result = await apiRequest<{ id: string }>(`/api/teams/${teamId}/cards`, {
      method: "POST",
      json: {
        label,
        rows,
        cols,
        freeCenter: hasFreeCenter,
        phraseIds: Array.from(selectedIds),
      },
      fallbackError: "Impossible de créer la grille",
    });
    if (!result.ok) {
      setCreating(false);
      setError(result.error);
      return;
    }
    router.push(`/play/${result.data.id}`);
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href={`/dashboard/teams/${teamId}`}
          className="mb-2 inline-block text-sm font-bold text-accent hover:underline"
        >
          ← Retour à l&apos;équipe
        </Link>
        <h1 className="font-display text-4xl font-semibold text-ink">
          Nouvelle grille<span className="text-accent">.</span>
        </h1>
        <p className="mt-1 text-ink-faint">Compose ta grille post-it pour cette semaine</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <div className="surface">
            <h2 className="mb-4 font-display text-xl text-ink">Configuration</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor={labelId} className="mb-1 block text-sm font-bold text-ink-muted">
                  Nom de la grille
                </label>
                <input
                  id={labelId}
                  className="input"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ex: Réunion du lundi"
                  maxLength={150}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <GridSizeInput label="Lignes" value={rows} onChange={setRows} />
                <GridSizeInput label="Colonnes" value={cols} onChange={setCols} />
              </div>

              {centerPos !== null && (
                <label className="group flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={freeCenter}
                    onChange={(e) => setFreeCenter(e.target.checked)}
                  />
                  <span
                    aria-hidden
                    className="flex h-6 w-6 items-center justify-center rounded-lg border-2 border-gray-300 transition-all group-hover:border-accent peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40"
                  >
                    {freeCenter && <span className="text-xs text-white">✓</span>}
                  </span>
                  <span className="text-sm font-semibold text-ink">Case centrale FREE ⭐</span>
                </label>
              )}
            </div>

            <GridPreview rows={rows} cols={cols} freePosition={hasFreeCenter ? centerPos : null} />
          </div>

          <div className="surface-spark">
            <h2 className="mb-3 font-display text-lg text-ink">Résumé</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-faint">Taille</dt>
                <dd className="font-bold text-ink">
                  {rows} × {cols} = {totalCells} cases
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-faint">Phrases nécessaires</dt>
                <dd className="font-bold text-ink">{needed}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-faint">Phrases sélectionnées</dt>
                <dd
                  className={`font-bold ${selectedIds.size >= needed ? "text-green-600" : "text-red-500"}`}
                >
                  {selectedIds.size} / {needed}
                </dd>
              </div>
            </dl>

            {error && (
              <div role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-500">
                ❌ {error}
              </div>
            )}

            <button
              type="button"
              onClick={() => void createCard()}
              className="btn-primary mt-4 w-full"
              disabled={creating || selectedIds.size < needed}
            >
              {creating ? "Génération..." : `Générer la grille (${selectedIds.size}/${needed})`}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="surface">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl text-accent">💬 Banque de phrases</h2>
              <div className="flex gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set([...custom, ...defaults].map((p) => p.id)))}
                  className="font-bold text-accent hover:underline"
                >
                  Tout sélectionner
                </button>
                <span aria-hidden className="text-paper-line">
                  |
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="font-bold text-ink-faint hover:underline"
                >
                  Tout désélectionner
                </button>
              </div>
            </div>

            <form ref={phraseFormRef} onSubmit={savePhrase} className="mb-6 space-y-2">
              {editingPhraseId && (
                <p className="text-xs font-bold text-accent">
                  Modification d&apos;une phrase personnalisée
                </p>
              )}
              <div className="flex gap-2">
                <EmojiPicker
                  value={newPhraseEmoji}
                  onChange={setNewPhraseEmoji}
                  open={emojiPickerOpen}
                  onOpenChange={setEmojiPickerOpen}
                />
                <label htmlFor={phraseInputId} className="sr-only">
                  {editingPhraseId ? "Modifier la phrase" : "Nouvelle phrase"}
                </label>
                <input
                  id={phraseInputId}
                  className="input flex-1"
                  placeholder={
                    editingPhraseId ? "Modifier la phrase..." : "Ajouter une phrase personnalisée..."
                  }
                  value={newPhraseText}
                  onChange={(e) => setNewPhraseText(e.target.value)}
                  maxLength={200}
                />
                <button
                  type="submit"
                  className="btn-primary px-4 py-2"
                  disabled={savingPhrase || !newPhraseText.trim()}
                >
                  {savingPhrase ? "..." : editingPhraseId ? "Enregistrer" : "+ Ajouter"}
                </button>
                {editingPhraseId && (
                  <button
                    type="button"
                    className="btn-secondary px-3 py-2"
                    onClick={resetPhraseForm}
                    disabled={savingPhrase}
                  >
                    Annuler
                  </button>
                )}
              </div>
            </form>

            {custom.length > 0 && (
              <PhraseSection title={`Phrases personnalisées (${custom.length})`}>
                <AnimatePresence>
                  {custom.map((phrase) => (
                    <PhraseChip
                      key={phrase.id}
                      phrase={phrase}
                      selected={selectedIds.has(phrase.id)}
                      editing={editingPhraseId === phrase.id}
                      onClick={() => togglePhrase(phrase.id)}
                      onEdit={() => startEditPhrase(phrase)}
                      onDelete={() => void deletePhrase(phrase)}
                    />
                  ))}
                </AnimatePresence>
              </PhraseSection>
            )}

            <PhraseSection title={`Phrases classiques (${defaults.length})`}>
              {defaults.map((phrase) => (
                <PhraseChip
                  key={phrase.id}
                  phrase={phrase}
                  selected={selectedIds.has(phrase.id)}
                  onClick={() => togglePhrase(phrase.id)}
                />
              ))}
            </PhraseSection>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhraseSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-faint">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function GridPreview({
  rows,
  cols,
  freePosition,
}: {
  rows: number;
  cols: number;
  freePosition: number | null;
}) {
  return (
    <div className="mt-4 rounded-md bg-accent-mist p-3">
      <p className="mb-2 text-center text-xs font-bold text-accent">Aperçu de la grille</p>
      <div
        aria-hidden
        className="mx-auto grid gap-1"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, maxWidth: `${cols * 28}px` }}
      >
        {Array.from({ length: rows * cols }, (_, i) => (
          <div
            key={i}
            className={`flex aspect-square items-center justify-center rounded text-xs font-bold ${
              i === freePosition ? "bg-yellow-300 text-yellow-800" : "bg-accent/20 text-accent"
            }`}
          >
            {i === freePosition ? "★" : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
