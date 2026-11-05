import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { jsonResponse, mockFetch, routerMock, sentJson } from "@/test-utils/mocks";
import { renderWithIntl } from "@/test-utils/i18n";
import type { AccountProfile } from "@/types";
import { AccountSettingsForm } from "../account-settings-form";

const mockUpdateSession = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => jest.requireActual("@/test-utils/mocks").routerMock,
}));
jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, update: mockUpdateSession }),
}));

const profile: AccountProfile = {
  id: "u1",
  name: "Alex",
  email: "alex@example.com",
  isAdmin: false,
  mustChangePassword: false,
  locale: "fr",
};

describe("AccountSettingsForm", () => {
  let fetchMock: ReturnType<typeof mockFetch>;

  beforeEach(() => {
    fetchMock = mockFetch();
  });

  it("pré-remplit le profil reçu du serveur", () => {
    renderWithIntl(<AccountSettingsForm initialProfile={profile} />);
    expect(screen.getByLabelText("Prénom")).toHaveValue("Alex");
    expect(screen.getByText("alex@example.com")).toBeInTheDocument();
  });

  it("refuse d'enregistrer sans modification", async () => {
    renderWithIntl(<AccountSettingsForm initialProfile={profile} />);
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Aucune modification à enregistrer");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("vérifie la confirmation du mot de passe", async () => {
    const user = userEvent.setup();
    renderWithIntl(<AccountSettingsForm initialProfile={profile} />);

    await user.type(screen.getByLabelText("Nouveau mot de passe (optionnel)"), "nouveau-mdp-solide");
    await user.type(screen.getByLabelText("Confirmer le mot de passe"), "autre-mdp-solide!");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Les mots de passe ne correspondent pas");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("enregistre le prénom et met à jour la session", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({ ...profile, name: "Sam" }));
    renderWithIntl(<AccountSettingsForm initialProfile={profile} />);

    await user.clear(screen.getByLabelText("Prénom"));
    await user.type(screen.getByLabelText("Prénom"), "Sam");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(sentJson(fetchMock)).toEqual({ name: "Sam" });
    expect(mockUpdateSession).toHaveBeenCalledWith({ name: "Sam", mustChangePassword: false });
    expect(await screen.findByRole("status")).toHaveTextContent("Compte mis à jour");
  });

  it("termine la configuration initiale et redirige", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({ ...profile, mustChangePassword: false }));
    renderWithIntl(<AccountSettingsForm initialProfile={{ ...profile, mustChangePassword: true }} />);

    expect(screen.queryByLabelText("Mot de passe actuel")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Nouveau mot de passe"), "nouveau-mdp-solide");
    await user.type(screen.getByLabelText("Confirmer le mot de passe"), "nouveau-mdp-solide");
    await user.click(screen.getByRole("button", { name: "Terminer la configuration" }));

    expect(sentJson(fetchMock)).toEqual({ name: "Alex", newPassword: "nouveau-mdp-solide" });
    expect(routerMock.push).toHaveBeenCalledWith("/dashboard");
  });

  it("enregistre le changement de langue immédiatement", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ...profile, locale: "en" }));
    renderWithIntl(<AccountSettingsForm initialProfile={profile} />);

    await userEvent.selectOptions(screen.getByLabelText("Langue"), "en");

    expect(sentJson(fetchMock)).toEqual({ locale: "en" });
    expect(mockUpdateSession).toHaveBeenCalledWith({ locale: "en" });
    expect(routerMock.refresh).toHaveBeenCalled();
  });
});
