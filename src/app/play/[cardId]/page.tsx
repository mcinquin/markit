import { notFound } from "next/navigation";
import { requireAccountReady } from "@/lib/account-guard";
import { getCardIfMember } from "@/lib/authz";
import { getPlayCard } from "@/lib/data";
import { PlayClient } from "@/components/play/play-client";

type Props = { params: Promise<{ cardId: string }> };

export default async function PlayPage({ params }: Props) {
  const [{ cardId }, { session, profile }] = await Promise.all([params, requireAccountReady()]);

  if (!profile.isAdmin && !(await getCardIfMember(session.user.id, cardId))) notFound();

  const card = await getPlayCard(cardId);
  if (!card) notFound();

  return (
    <PlayClient initialCard={card} currentUser={{ id: session.user.id, name: profile.name }} />
  );
}
