import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="text-center max-w-2xl mx-auto">
        {/* Logo */}
        <div className="text-8xl mb-6 animate-bounce">🎰</div>

        <h1 className="text-7xl font-display text-transparent bg-clip-text bg-gradient-to-r from-bingo-pink via-bingo-purple to-bingo-blue mb-4">
          MarkIt
        </h1>

        <p className="text-2xl text-gray-600 font-body mb-2">
          Rendez vos réunions d&apos;équipe infiniment plus fun !
        </p>
        <p className="text-lg text-gray-400 font-body mb-10">
          Créez des grilles de bingo personnalisées, jouez en temps réel avec votre équipe,
          et décrochez le BINGO ! 🏆
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link href="/auth/signin" className="btn-primary text-xl px-10">
            Se connecter 🚀
          </Link>
        </div>
        <p className="text-sm text-gray-400 -mt-10 mb-10">
          L&apos;accès se fait uniquement sur invitation.
        </p>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
          {[
            {
              emoji: "🎯",
              title: "Grilles personnalisées",
              desc: "Créez des grilles avec vos phrases favorites de réunion",
            },
            {
              emoji: "⚡",
              title: "Temps réel",
              desc: "Toute l'équipe voit les cases cochées instantanément",
            },
            {
              emoji: "🏆",
              title: "Historique",
              desc: "Retrouvez toutes les grilles passées et vos stats",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="card text-center hover:scale-105 transition-transform duration-200"
            >
              <div className="text-4xl mb-3">{f.emoji}</div>
              <h3 className="text-lg font-display text-bingo-purple mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
