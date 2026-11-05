"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { canChangeRole, hasTeamRole, type TeamActor } from "@/lib/authz-rules";
import type { TeamOverviewMember } from "@/lib/data";
import { ROLE_LABELS, TEAM_ROLES, type TeamRole } from "@/lib/team-roles";

type Props = {
  teamId: string;
  initialMembers: TeamOverviewMember[];
  actor: TeamActor;
};

/** Liste des membres ; l'OWNER (ou l'admin du site) peut changer les rôles. */
export function TeamMembers({ teamId, initialMembers, actor }: Props) {
  const router = useRouter();
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
      fallbackError: "Changement de rôle impossible",
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

  return (
    <section aria-labelledby="team-members-title" className="mb-8">
      <h2 id="team-members-title" className="mb-3 font-display text-2xl text-ink">
        Membres
      </h2>

      {error && (
        <p role="alert" className="mb-3 text-sm font-semibold text-danger">
          {error}
        </p>
      )}

      <ul className="surface divide-y divide-paper-line">
        {members.map((member) => {
          const name = member.user.name ?? "Sans nom";
          const isSelf = member.user.id === actor.userId;
          return (
            <li key={member.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="min-w-0 truncate font-bold text-ink">
                {name}
                {isSelf && <span className="ml-1 font-normal text-ink-faint">(toi)</span>}
              </span>

              {canEditRoles ? (
                <select
                  aria-label={`Rôle de ${name}`}
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
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              ) : (
                <span className={member.role === "MEMBER" ? "chip" : "chip-accent"}>
                  {ROLE_LABELS[member.role]}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
