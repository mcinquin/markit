import { requireAccountReady } from "@/lib/account-guard";
import { getUserTeams } from "@/lib/data";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const { session } = await requireAccountReady();
  const teams = await getUserTeams(session.user.id);

  return (
    <DashboardClient
      initialTeams={JSON.parse(JSON.stringify(teams))}
    />
  );
}
