import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar/navbar";
import { requireAccountReady } from "@/lib/account-guard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session } = await requireAccountReady();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
