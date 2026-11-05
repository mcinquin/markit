import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TeamCardSummary, TeamOverview } from "@/lib/data";
import { jsonResponse, mockFetch, routerMock } from "@/test-utils/mocks";
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
    render(<TeamClient team={team} initialCards={cards} userId="me" isAdmin={false} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Produit");
    expect(screen.getByText(/3 membres · 2 grilles/)).toBeInTheDocument();
    expect(within(cardItem("Grille c1")).getByText("50%")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Grille c1/ })).toHaveAttribute("href", "/play/c1");
  });

  it("ne propose la suppression qu'au créateur", () => {
    render(<TeamClient team={team} initialCards={cards} userId="me" isAdmin={false} />);

    expect(screen.queryByRole("button", { name: "Supprimer l'équipe" })).not.toBeInTheDocument();
    expect(within(cardItem("Grille c1")).getByRole("button", { name: "Supprimer" })).toBeInTheDocument();
    expect(within(cardItem("Grille c2")).queryByRole("button", { name: "Supprimer" })).not.toBeInTheDocument();
  });

  it("propose toutes les suppressions à un admin", () => {
    render(<TeamClient team={team} initialCards={cards} userId="me" isAdmin />);

    expect(screen.getByRole("button", { name: "Supprimer l'équipe" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Supprimer" })).toHaveLength(2);
  });

  it("supprime une grille après confirmation", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    render(<TeamClient team={team} initialCards={cards} userId="me" isAdmin={false} />);

    await userEvent.click(within(cardItem("Grille c1")).getByRole("button", { name: "Supprimer" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/cards/c1", expect.objectContaining({ method: "DELETE" }));
    expect(screen.queryByRole("link", { name: /Grille c1/ })).not.toBeInTheDocument();
  });

  it("garde la grille et affiche l'erreur si la suppression échoue", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "Suppression non autorisée" }, 403));
    render(<TeamClient team={team} initialCards={cards} userId="me" isAdmin={false} />);

    await userEvent.click(within(cardItem("Grille c1")).getByRole("button", { name: "Supprimer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Suppression non autorisée");
    expect(screen.getByRole("link", { name: /Grille c1/ })).toBeInTheDocument();
  });

  it("n'appelle pas l'API si l'utilisateur annule", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(false);
    render(<TeamClient team={team} initialCards={cards} userId="me" isAdmin />);

    await userEvent.click(screen.getByRole("button", { name: "Supprimer l'équipe" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(routerMock.push).not.toHaveBeenCalled();
  });
});
