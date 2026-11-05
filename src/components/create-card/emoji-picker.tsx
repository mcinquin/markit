"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { EMOJI_CATEGORIES } from "@/lib/phrase-emojis";

type Props = {
  value: string;
  onChange: (emoji: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Bouton + popover de sélection d'emoji (fermeture au clic extérieur et à Échap). */
export function EmojiPicker({ value, onChange, open, onOpenChange }: Props) {
  const t = useTranslations("emojiPicker");
  const [categoryId, setCategoryId] = useState(EMOJI_CATEGORIES[0].id);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeCategory =
    EMOJI_CATEGORIES.find((category) => category.id === categoryId) ?? EMOJI_CATEGORIES[0];
  const activeLabel = t(`categories.${activeCategory.id}`);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!containerRef.current?.contains(event.target as Node)) onOpenChange(false);
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onOpenChange]);

  function select(emoji: string) {
    onChange(emoji);
    onOpenChange(false);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="input flex w-12 flex-none items-center justify-center px-0 text-xl hover:border-accent"
        aria-label={t("choose")}
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        {value || "😄"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full z-20 mt-2 w-80 rounded-sm border border-paper-line bg-note p-3 shadow-[3px_4px_0_rgba(15,23,42,0.12)] sm:w-96"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">{t("choose")}</p>
              {value && (
                <button
                  type="button"
                  className="text-xs font-bold text-ink-faint hover:text-accent"
                  onClick={() => select("")}
                >
                  {t("clear")}
                </button>
              )}
            </div>

            <div className="mb-2 flex gap-1 overflow-x-auto pb-1">
              {EMOJI_CATEGORIES.map((category) => {
                const label = t(`categories.${category.id}`);
                return (
                  <button
                    key={category.id}
                    type="button"
                    title={label}
                    aria-label={label}
                    aria-pressed={category.id === activeCategory.id}
                    className={`flex h-8 w-8 flex-none items-center justify-center rounded-sm text-base transition-colors ${
                      category.id === activeCategory.id
                        ? "bg-accent-soft ring-1 ring-accent/40"
                        : "hover:bg-accent-mist"
                    }`}
                    onClick={() => setCategoryId(category.id)}
                  >
                    {category.icon}
                  </button>
                );
              })}
            </div>

            <p className="mb-2 text-xs font-bold text-ink-faint">{activeLabel}</p>

            <div className="grid max-h-56 grid-cols-8 gap-1 overflow-y-auto pr-1">
              {activeCategory.emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`flex aspect-square items-center justify-center rounded-sm text-lg transition-colors hover:bg-accent-mist ${
                    value === emoji ? "bg-accent-soft ring-1 ring-accent/40" : ""
                  }`}
                  onClick={() => select(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
