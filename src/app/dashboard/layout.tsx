import { Navbar } from "@/components/Navbar";
import { requireAccountReady } from "@/lib/account-guard";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAccountReady();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
