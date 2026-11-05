import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TeamActor } from "@/lib/authz-rules";
import type { TeamCardSummary, TeamOverview } from "@/lib/data";
import type { TeamRole } from "@/lib/team-roles";
import { jsonResponse, mockFetch, routerMock, sentJson } from "@/test-utils/mocks";
import { renderWithIntl } from "@/test-utils/i18n";
import { TeamClient } from "../team-client";

jest.mock("next/navigation", () => ({
  useRouter: () => jest.requireActual("@/test-utils/mocks").routerMock,
}));

const team: TeamOverview = {
  id: "t1",
  name: "Produit",
  inviteCode: "INVITE",
  createdById: "owner",
  _count: { members: 3 },
  members: [
    { id: "m-owner", role: "OWNER", user: { id: "owner", name: "Olga" } },
    { id: "m-me", role: "MEMBER", user: { id: "me", name: "Moi" } },
    { id: "m-other", role: "MEMBER", user: { id: "someone-else", name: "Sam" } },
  ],
};

function makeCard(id: string, createdById: string | null, checked = 0): TeamCardSummary {
  return {
    id,
    label: `Grille ${id}`,
    rows: 2,
    cols: 2,
    isActive: false,
    createdAt: new Date(),
    createdById,
    playedAt: null,
    cells: Array.from({ length: 4 }, (_, i) => ({ checked: i < checked ? [{ id: `k${i}` }] : [] })),
  };
}

const cards = [makeCard("c1", "me", 2), makeCard("c2", "someone-else")];

function actor(userId: string, role: TeamRole | null, isSiteAdmin = false): TeamActor {
  return { userId, role, isSiteAdmin };
}

const member = actor("me", "MEMBER");
const owner = actor("owner", "OWNER");
const siteAdmin = actor("me", "MEMBER", true);

function cardItem(label: string) {
  return screen.getByRole("link", { name: new RegExp(label) }).closest("li") as HTMLElement;
}

describe("TeamClient", () => {
  let fetchMock: ReturnType<typeof mockFetch>;

  beforeEach(() => {
    fetchMock = mockFetch();
    jest.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("affiche l'équipe et la progression des grilles", () => {
    renderWithIntl(<TeamClient team={team} initialCards={cards} actor={member} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Produit");
    expect(screen.getByText(/3 membres · 2 grilles/)).toBeInTheDocument();
    expect(within(cardItem("Grille c1")).getByText("50%")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Grille c1/ })).toHaveAttribute("href", "/play/c1");
  });

  it("ne propose à un MEMBER que la suppression de ses propres grilles", () => {
    renderWithIntl(<TeamClient team={team} initialCards={cards} actor={member} />);

    expect(screen.queryByRole("button", { name: "Supprimer l'équipe" })).not.toBeInTheDocument();
    expect(within(cardItem("Grille c1")).getByRole("button", { name: "Supprimer" })).toBeInTheDocument();
    expect(within(cardItem("Grille c2")).queryByRole("button", { name: "Supprimer" })).not.toBeInTheDocument();
  });

  it("propose à un ADMIN toutes les grilles, mais pas l'équipe", () => {
    renderWithIntl(<TeamClient team={team} initialCards={cards} actor={actor("me", "ADMIN")} />);

    expect(screen.queryByRole("button", { name: "Supprimer l'équipe" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Supprimer" })).toHaveLength(2);
  });

  it("propose toutes les suppressions à l'OWNER et à l'admin du site", () => {
    for (const who of [owner, siteAdmin]) {
      const { unmount } = renderWithIntl(<TeamClient team={team} initialCards={cards} actor={who} />);
      expect(screen.getByRole("button", { name: "Supprimer l'équipe" })).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: "Supprimer" })).toHaveLength(2);
      unmount();
    }
  });

  it("supprime une grille après confirmation", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    renderWithIntl(<TeamClient team={team} initialCards={cards} actor={member} />);

    await userEvent.click(within(cardItem("Grille c1")).getByRole("button", { name: "Supprimer" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/cards/c1", expect.objectContaining({ method: "DELETE" }));
    expect(screen.queryByRole("link", { name: /Grille c1/ })).not.toBeInTheDocument();
  });

  it("garde la grille et affiche l'erreur si la suppression échoue", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "Suppression non autorisée" }, 403));
    renderWithIntl(<TeamClient team={team} initialCards={cards} actor={member} />);

    await userEvent.click(within(cardItem("Grille c1")).getByRole("button", { name: "Supprimer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Suppression non autorisée");
    expect(screen.getByRole("link", { name: /Grille c1/ })).toBeInTheDocument();
  });

  it("n'appelle pas l'API si l'utilisateur annule", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(false);
    renderWithIntl(<TeamClient team={team} initialCards={cards} actor={owner} />);

    await userEvent.click(screen.getByRole("button", { name: "Supprimer l'équipe" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(routerMock.push).not.toHaveBeenCalled();
  });
});

describe("TeamClient — membres", () => {
  let fetchMock: ReturnType<typeof mockFetch>;

  beforeEach(() => {
    fetchMock = mockFetch();
  });

  it("affiche les rôles sans sélecteur pour un MEMBER", () => {
    renderWithIntl(<TeamClient team={team} initialCards={cards} actor={member} />);

    const list = screen.getByRole("region", { name: "Membres" });
    expect(within(list).getByText("Propriétaire")).toBeInTheDocument();
    expect(within(list).queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("donne un sélecteur de rôle à l'OWNER et protège le dernier OWNER", () => {
    renderWithIntl(<TeamClient team={team} initialCards={cards} actor={owner} />);

    expect(screen.getAllByRole("combobox")).toHaveLength(3);
    const ownerSelect = screen.getByRole("combobox", { name: "Rôle de Olga" });
    expect(within(ownerSelect).getByRole("option", { name: "Membre" })).toBeDisabled();
    expect(within(ownerSelect).getByRole("option", { name: "Propriétaire" })).toBeEnabled();
  });

  it("change le rôle d'un membre", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: "m-other", role: "ADMIN" }));
    renderWithIntl(<TeamClient team={team} initialCards={cards} actor={owner} />);

    const select = screen.getByRole("combobox", { name: "Rôle de Sam" });
    await userEvent.selectOptions(select, "ADMIN");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/teams/t1/members/m-other",
      expect.objectContaining({ method: "PATCH" })
    );
    expect(sentJson(fetchMock)).toEqual({ role: "ADMIN" });
    expect(select).toHaveValue("ADMIN");
  });

  it("rétablit le rôle et affiche l'erreur si l'API refuse", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "Refusé" }, 403));
    renderWithIntl(<TeamClient team={team} initialCards={cards} actor={owner} />);

    const select = screen.getByRole("combobox", { name: "Rôle de Sam" });
    await userEvent.selectOptions(select, "ADMIN");

    expect(await screen.findByRole("alert")).toHaveTextContent("Refusé");
    expect(select).toHaveValue("MEMBER");
  });
});
