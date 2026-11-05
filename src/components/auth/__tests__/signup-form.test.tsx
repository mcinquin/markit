import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signIn } from "next-auth/react";
import { jsonResponse, mockFetch, routerMock, sentJson } from "@/test-utils/mocks";
import { renderWithIntl } from "@/test-utils/i18n";
import { SignUpForm } from "../signup-form";

jest.mock("next/navigation", () => ({
  useRouter: () => jest.requireActual("@/test-utils/mocks").routerMock,
}));
jest.mock("next-auth/react", () => ({ signIn: jest.fn() }));

const signInMock = signIn as jest.Mock;

async function fillAndSubmit() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Prénom"), "Alex");
  await user.type(screen.getByLabelText("Email"), "alex@example.com");
  await user.type(screen.getByLabelText("Mot de passe"), "un-mot-de-passe-solide");
  await user.click(screen.getByRole("button", { name: "Créer mon compte" }));
}

describe("SignUpForm", () => {
  let fetchMock: ReturnType<typeof mockFetch>;

  beforeEach(() => {
    fetchMock = mockFetch();
  });

  it("inscrit, connecte puis redirige vers le dashboard", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: "u1" }, 201));
    signInMock.mockResolvedValue({ ok: true, error: null });
    renderWithIntl(<SignUpForm inviteToken="tok-123" />);

    await fillAndSubmit();

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/register", expect.anything());
    expect(sentJson(fetchMock)).toEqual({
      name: "Alex",
      email: "alex@example.com",
      password: "un-mot-de-passe-solide",
      inviteToken: "tok-123",
    });
    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "alex@example.com",
      password: "un-mot-de-passe-solide",
      redirect: false,
    });
    expect(routerMock.push).toHaveBeenCalledWith("/dashboard");
  });

  it("affiche l'erreur de l'API sans se connecter", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: "Ce lien d'invitation a expiré" }, 403)
    );
    renderWithIntl(<SignUpForm inviteToken="tok-123" />);

    await fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent("Ce lien d'invitation a expiré");
    expect(signInMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Créer mon compte" })).toBeEnabled();
  });

  it("renvoie vers la connexion si la connexion automatique échoue", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: "u1" }, 201));
    signInMock.mockResolvedValue({ ok: false, error: "CredentialsSignin" });
    renderWithIntl(<SignUpForm inviteToken="tok-123" />);

    await fillAndSubmit();

    expect(routerMock.push).toHaveBeenCalledWith("/auth/signin");
  });
});
