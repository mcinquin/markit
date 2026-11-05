import { requireAdmin } from "@/lib/account-guard";
import { getAdminInvites, getAdminUsers } from "@/lib/data";
import { AdminClient } from "@/components/admin/admin-client";

export default async function AdminPage() {
  await requireAdmin();
  const [users, invites] = await Promise.all([getAdminUsers(), getAdminInvites()]);

  return (
    <AdminClient initialUsers={users} initialInvites={invites} />
  );
}
