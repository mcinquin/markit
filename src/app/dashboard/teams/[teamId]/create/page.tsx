import { notFound } from "next/navigation";
import { requireAccountReady } from "@/lib/account-guard";
import { getTeamMembership } from "@/lib/authz";
import { canManagePhrases } from "@/lib/authz-rules";
import { getTeamPhrases } from "@/lib/data";
import { CreateCardClient } from "@/components/create-card/create-card-client";

type Props = { params: Promise<{ teamId: string }> };

export default async function CreateCardPage({ params }: Props) {
  const [{ teamId }, { session, profile }] = await Promise.all([params, requireAccountReady()]);

  const membership = await getTeamMembership(session.user.id, teamId);
  if (!membership) notFound();

  const { defaults, custom } = await getTeamPhrases(teamId);
  const canEditPhrases = canManagePhrases({
    userId: session.user.id,
    role: membership.role,
    isSiteAdmin: profile.isAdmin,
  });

  return (
    <CreateCardClient
      teamId={teamId}
      initialDefaults={defaults}
      initialCustom={custom}
      canManagePhrases={canEditPhrases}
    />
  );
}
