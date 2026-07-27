"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect } from "react";

export function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((d) => setIsAdmin(d.isAdmin === true))
      .catch(() => {});
  }, [session?.user?.id]);

  return (
    <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-purple-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <span className="text-2xl group-hover:animate-wiggle">🎰</span>
          <span className="text-2xl font-display text-transparent bg-clip-text bg-gradient-to-r from-bingo-pink to-bingo-purple">
            MarkIt
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-sm text-gray-500 font-semibold">
            Bonjour, {session?.user?.name?.split(" ")[0] || "toi"} 👋
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 bg-purple-50 hover:bg-purple-100 rounded-2xl px-4 py-2 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-bingo-pink to-bingo-purple flex items-center justify-center text-white font-bold text-sm">
                {session?.user?.name?.[0]?.toUpperCase() || "?"}
              </div>
              {isAdmin && (
                <span className="text-xs bg-bingo-purple text-white px-1.5 py-0.5 rounded-full font-bold">
                  Admin
                </span>
              )}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-purple-100 py-2 min-w-[200px] z-50">
                <div className="px-4 py-2 border-b border-purple-50">
                  <p className="font-bold text-gray-700 text-sm">{session?.user?.name}</p>
                  <p className="text-gray-400 text-xs truncate">{session?.user?.email}</p>
                </div>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-bingo-purple hover:bg-purple-50 transition-colors font-semibold"
                  >
                    ⚙️ Administration
                  </Link>
                )}
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors font-semibold"
                >
                  🚪 Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
