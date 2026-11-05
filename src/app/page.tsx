import { getServerSession } from "next-auth";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LandingHero } from "@/components/landing-hero/landing-hero";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect(session.user.mustChangePassword ? "/account" : "/dashboard");
  }

  const t = await getTranslations("landing");

  const steps = [
    { step: "01", title: t("steps.team.title"), desc: t("steps.team.desc") },
    { step: "02", title: t("steps.card.title"), desc: t("steps.card.desc") },
    { step: "03", title: t("steps.bingo.title"), desc: t("steps.bingo.desc") },
  ];

  return (
    <main>
      <LandingHero />
      <section className="border-t border-paper-line bg-white/70">
        <div className="mx-auto max-w-6xl px-4 py-16 lg:px-6">
          <h2 className="font-display text-2xl font-semibold text-ink">{t("stepsTitle")}</h2>
          <p className="mt-2 max-w-2xl text-ink-faint">{t("stepsIntro")}</p>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {steps.map((item, i) => (
              <li
                key={item.step}
                className={`surface-fun ${i % 2 === 0 ? "hover:rotate-1" : "hover:-rotate-1"}`}
              >
                <p className="font-display text-sm font-semibold text-accent">{item.step}</p>
                <h3 className="mt-2 font-display text-lg font-semibold text-ink">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-faint">{item.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
