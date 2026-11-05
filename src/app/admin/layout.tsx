import { Navbar } from "@/components/navbar/navbar";
import { requireAdmin } from "@/lib/account-guard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-screen">
      <Navbar isAdmin />
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
