import { getAccountProfile } from "@/lib/account";
import { requireSession } from "@/lib/account-guard";
import { Navbar } from "@/components/Navbar";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const profile = await getAccountProfile(session.user.id);

  return (
    <div className="min-h-screen">
      <Navbar minimal={profile?.mustChangePassword === true} />
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
