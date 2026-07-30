import { requireAccountReady } from "@/lib/account-guard";
import { getAdminInvites, getAdminUsers } from "@/lib/data";
import { AdminClient } from "@/components/admin/admin-client";

export default async function AdminPage() {
  await requireAccountReady();
  const [users, invites] = await Promise.all([getAdminUsers(), getAdminInvites()]);

  return (
    <AdminClient
      initialUsers={JSON.parse(JSON.stringify(users))}
      initialInvites={JSON.parse(JSON.stringify(invites))}
    />
  );
}
