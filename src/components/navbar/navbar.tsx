"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { MarkItBrand } from "@/components/markit-logo/markit-logo";

type NavbarProps = {
  minimal?: boolean;
};

export function Navbar({ minimal = false }: NavbarProps) {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!session?.user?.id || minimal) return;
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((d) => setIsAdmin(d.isAdmin === true))
      .catch(() => {});
  }, [session?.user?.id, minimal]);

  return (
    <nav className="sticky top-0 z-50 border-b border-paper-line bg-note/90 backdrop-blur-md shadow-[0_2px_0_rgba(15,23,42,0.04)]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          href={minimal ? "/account" : "/dashboard"}
          className="transition-transform hover:-rotate-1"
        >
          <MarkItBrand />
        </Link>

        <div className="flex items-center gap-3">
          {!minimal && (
            <p className="hidden text-sm text-ink-faint sm:block">
              {session?.user?.name?.split(" ")[0] || "Compte"}
            </p>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 rounded-sm border border-paper-line bg-note px-2.5 py-1.5 shadow-[1px_2px_0_rgba(15,23,42,0.06)] transition-all hover:-rotate-1 hover:border-accent"
              aria-expanded={menuOpen}
              aria-label="Menu compte"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-accent text-xs font-bold text-white">
                {session?.user?.name?.[0]?.toUpperCase() || "?"}
              </span>
              {!minimal && isAdmin && <span className="chip-spark">Admin</span>}
            </button>

            {menuOpen && (
              <div className="surface absolute right-0 top-full z-50 mt-2 min-w-[200px] rotate-1 p-0 py-1">
                <div className="border-b border-paper-line px-3 py-2">
                  <p className="text-sm font-semibold text-ink">{session?.user?.name}</p>
                  <p className="truncate text-xs text-ink-faint">{session?.user?.email}</p>
                </div>
                {!minimal && (
                  <>
                    <Link
                      href="/account"
                      onClick={() => setMenuOpen(false)}
                      className="block px-3 py-2 text-sm font-semibold text-ink-muted hover:bg-accent-mist hover:text-accent"
                    >
                      Mon compte
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="block px-3 py-2 text-sm font-semibold text-ink-muted hover:bg-accent-mist hover:text-accent"
                      >
                        Administration
                      </Link>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full px-3 py-2 text-left text-sm font-semibold text-danger hover:bg-danger-soft"
                >
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
