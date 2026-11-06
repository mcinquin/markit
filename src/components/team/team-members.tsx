"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "@/app/dashboard/utils/date";
import { apiRequest } from "@/lib/api-client";
import { canChangeRole, canRemoveMember, hasTeamRole, type TeamActor } from "@/lib/authz-rules";
import type { TeamOverviewMember } from "@/lib/data";
import { TEAM_ROLES, type TeamRole } from "@/lib/team-roles";

type Props = {
  teamId: string;
  initialMembers: TeamOverviewMember[];
  actor: TeamActor;
};

/** Liste des membres ; rôles (OWNER), retrait (ADMIN+) et départ. */
export function TeamMembers({ teamId, initialMembers, actor }: Props) {
  const router = useRouter();
  const t = useTranslations("team.members");
  const tRoles = useTranslations("roles");
  const tApi = useTranslations("apiClient");
  const tDates = useTranslations("dates.relative");
  const [members, setMembers] = useState(initialMembers);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const canEditRoles = hasTeamRole(actor, "OWNER");
  const ownerCount = members.filter((m) => m.role === "OWNER").length;

  async function changeRole(member: TeamOverviewMember, role: TeamRole) {
    if (role === member.role) return;
    const previous = members;
    setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, role } : m)));
    setSavingId(member.id);
    setError("");

    const result = await apiRequest(`/api/teams/${teamId}/members/${member.id}`, {
      method: "PATCH",
      json: { role },
      fallbackError: t("changeFailed"),
      networkError: tApi("network"),
    });
    setSavingId(null);

    if (!result.ok) {
      setMembers(previous);
      setError(result.error);
      return;
    }
    // Ses propres droits ont changé : recharger les permissions côté serveur
    if (member.user.id === actor.userId) router.refresh();
  }

  async function removeMember(member: TeamOverviewMember) {
    const isSelf = member.user.id === actor.userId;
    const name = member.user.name ?? t("noName");
    if (!confirm(isSelf ? t("confirmLeave") : t("confirmRemove", { name }))) return;

    const previous = members;
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
    setSavingId(member.id);
    setError("");

    const result = await apiRequest(`/api/teams/${teamId}/members/${member.id}`, {
      method: "DELETE",
      fallbackError: isSelf ? t("leaveFailed") : t("removeFailed"),
      networkError: tApi("network"),
    });
    setSavingId(null);

    if (!result.ok) {
      setMembers(previous);
      setError(result.error);
      return;
    }

    if (isSelf) {
      router.push("/dashboard");
      router.refresh();
      return;
    }
    router.refresh();
  }

  return (
    <section aria-labelledby="team-members-title" className="mb-8">
      <h2 id="team-members-title" className="mb-3 font-display text-2xl text-ink">
        {t("title")}
      </h2>

      {error && (
        <p role="alert" className="mb-3 text-sm font-semibold text-danger">
          {error}
        </p>
      )}

      <ul className="surface divide-y divide-paper-line">
        {members.map((member) => {
          const name = member.user.name ?? t("noName");
          const isSelf = member.user.id === actor.userId;
          const canRemove = canRemoveMember(actor, { userId: member.user.id, role: member.role }, ownerCount);
          const joinedLabel = t("joined", {
            date: formatDistanceToNow(member.joinedAt, (key, values) =>
              values ? tDates(key as "days", values) : tDates(key as "today")
            ),
          });

          return (
            <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <span className="block truncate font-bold text-ink">
                  {name}
                  {isSelf && <span className="ml-1 font-normal text-ink-faint">{t("you")}</span>}
                </span>
                <span className="text-sm text-ink-faint">{joinedLabel}</span>
              </div>

              <div className="flex flex-shrink-0 items-center gap-2">
                {canEditRoles ? (
                  <select
                    aria-label={t("roleOf", { name })}
                    className="rounded-sm border border-paper-line bg-note px-2 py-1 text-sm"
                    value={member.role}
                    disabled={savingId === member.id}
                    onChange={(e) => void changeRole(member, e.target.value as TeamRole)}
                  >
                    {TEAM_ROLES.map((role) => (
                      <option
                        key={role}
                        value={role}
                        disabled={!canChangeRole(actor, member, role, ownerCount)}
                      >
                        {tRoles(role)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={member.role === "MEMBER" ? "chip" : "chip-accent"}>
                    {tRoles(member.role)}
                  </span>
                )}

                {canRemove && (
                  <button
                    type="button"
                    className="rounded-sm px-2 py-1 text-xs font-bold text-danger hover:bg-danger/10"
                    disabled={savingId === member.id}
                    onClick={() => void removeMember(member)}
                  >
                    {savingId === member.id ? "…" : isSelf ? t("leave") : t("remove")}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
