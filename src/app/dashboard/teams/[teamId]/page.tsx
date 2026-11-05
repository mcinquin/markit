import { notFound } from "next/navigation";
import { requireAccountReady } from "@/lib/account-guard";
import { getTeamMembership } from "@/lib/authz";
import { getTeamCards, getTeamOverview } from "@/lib/data";
import { TeamClient } from "@/components/team/team-client";

type Props = { params: Promise<{ teamId: string }> };

export default async function TeamPage({ params }: Props) {
  const [{ teamId }, { session, profile }] = await Promise.all([params, requireAccountReady()]);

  const membership = await getTeamMembership(session.user.id, teamId);
  if (!membership) notFound();

  const [team, cards] = await Promise.all([getTeamOverview(teamId), getTeamCards(teamId)]);
  if (!team) notFound();

  return (
    <TeamClient
      team={team}
      initialCards={cards}
      userId={session.user.id}
      isAdmin={profile.isAdmin}
    />
  );
}
