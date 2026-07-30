import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LandingHero } from "@/components/landing-hero/landing-hero";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect(session.user.mustChangePassword ? "/account" : "/dashboard");
  }

  return (
    <main>
      <LandingHero />
      <section className="border-t border-paper-line bg-white/70">
        <div className="mx-auto max-w-6xl px-4 py-16 lg:px-6">
          <h2 className="font-display text-2xl font-semibold text-ink">Trois étapes, zéro slide</h2>
          <p className="mt-2 max-w-2xl text-ink-faint">
            Crée une équipe, balance une grille avec vos phrases de réunion, joue pendant le call.
            Les cases se cochent pour tout le monde en direct.
          </p>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Équipe",
                desc: "Invite tes collègues avec un code — en 10 secondes.",
              },
              {
                step: "02",
                title: "Grille",
                desc: "Pioche dans la banque de phrases (ou invente les tiennes).",
              },
              {
                step: "03",
                title: "Bingo",
                desc: "Coche, regarde les confettis, gagne la réunion.",
              },
            ].map((item, i) => (
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
