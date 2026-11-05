import { notFound } from "next/navigation";
import { requireAccountReady } from "@/lib/account-guard";
import { getTeamMembership } from "@/lib/authz";
import { getTeamPhrases } from "@/lib/data";
import { CreateCardClient } from "@/components/create-card/create-card-client";

type Props = { params: Promise<{ teamId: string }> };

export default async function CreateCardPage({ params }: Props) {
  const [{ teamId }, { session }] = await Promise.all([params, requireAccountReady()]);

  if (!(await getTeamMembership(session.user.id, teamId))) notFound();

  const { defaults, custom } = await getTeamPhrases(teamId);

  return <CreateCardClient teamId={teamId} initialDefaults={defaults} initialCustom={custom} />;
}
