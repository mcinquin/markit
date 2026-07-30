import { requireAccountReady } from "@/lib/account-guard";
import { getUserTeams } from "@/lib/data";
import { isAdmin } from "@/lib/admin";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const { session } = await requireAccountReady();
  const [teams, userIsAdmin] = await Promise.all([
    getUserTeams(session.user.id),
    isAdmin(session.user.id),
  ]);

  return (
    <DashboardClient
      initialTeams={JSON.parse(JSON.stringify(teams))}
      isAdmin={userIsAdmin}
    />
  );
}
