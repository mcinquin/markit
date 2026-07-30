import { Navbar } from "@/components/navbar/navbar";
import { requireAccountReady } from "@/lib/account-guard";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAccountReady();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
