import { getSessionProfile } from "@/lib/account-guard";
import { Navbar } from "@/components/navbar/navbar";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();

  return (
    <div className="min-h-screen">
      <Navbar
        minimal={profile?.mustChangePassword === true}
        isAdmin={profile?.isAdmin === true}
      />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
