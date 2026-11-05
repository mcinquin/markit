import { Navbar } from "@/components/navbar/navbar";
import { requireAccountReady } from "@/lib/account-guard";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAccountReady();

  return (
    <div className="min-h-screen">
      <Navbar isAdmin={profile.isAdmin} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
