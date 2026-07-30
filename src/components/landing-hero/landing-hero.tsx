"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MarkItLogo } from "@/components/markit-logo/markit-logo";

const DEMO_PHRASES = [
  "Quick win",
  "On est alignés ?",
  "Synergies",
  "Deep dive",
  "Roadmap",
  "FREE",
  "KPIs",
  "Agile",
  "Offline",
];

export function LandingHero() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section className="relative min-h-[100svh] overflow-hidden">
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="absolute inset-y-0 right-0 grid w-full grid-cols-3 gap-2 p-4 lg:w-[58%] lg:gap-3 lg:p-8 lg:pl-2">
          {DEMO_PHRASES.map((text, i) => {
            const isFree = text === "FREE";
            const isChecked = isFree || i === 1 || i === 4 || i === 7;
            const tilt = i % 3 === 0 ? "rotate-2" : i % 3 === 1 ? "-rotate-1" : "rotate-1";
            return (
              <div
                key={text}
                className={`relative flex items-center justify-center overflow-hidden rounded-sm border p-3 text-center text-[11px] font-semibold tracking-tight shadow-[2px_3px_0_rgba(15,23,42,0.1)] transition-all duration-500 sm:p-5 sm:text-sm ${tilt} ${
                  isChecked
                    ? isFree
                      ? "border-spark-deep/40 bg-spark text-ink"
                      : "border-accent/40 bg-accent-soft text-accent-hover"
                    : "border-paper-line bg-note text-ink-muted"
                } ${ready ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
                style={{ transitionDelay: `${70 + i * 45}ms` }}
              >
                <span
                  className={`absolute right-0 top-0 h-0 w-0 border-l-[12px] border-t-[12px] border-l-transparent ${
                    isFree ? "border-t-spark-deep/30" : "border-t-black/[0.06]"
                  }`}
                />
                {text}
              </div>
            );
          })}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-paper via-paper/95 to-transparent lg:via-paper/80" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-center px-4 py-20 lg:px-6">
        <div
          className={`max-w-xl transition-all duration-700 ${
            ready ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <MarkItLogo className="h-24 w-auto max-w-[280px] sm:h-28" />
          <h1 className="mt-6 font-display text-2xl font-semibold leading-snug text-ink-muted sm:text-3xl">
            Le bingo qui sauve les réunions interminables.
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-ink-faint sm:text-lg">
            Compose ta grille, coche en live avec l&apos;équipe, et crie bingo avant la fin du
            «&nbsp;quick sync&nbsp;».
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/auth/signin" className="btn-primary px-8 text-base">
              C&apos;est parti
            </Link>
          </div>
          <p className="mt-4 text-sm text-ink-faint">Sur invitation — pas de spam, juste du bingo.</p>
        </div>
      </div>
    </section>
  );
}
