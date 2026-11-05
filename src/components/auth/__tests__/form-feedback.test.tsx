import { render, screen } from "@testing-library/react";
import { FormError, FormSuccess } from "../form-feedback";

describe("FormError", () => {
  it("n'affiche rien sans message", () => {
    const { container } = render(<FormError message="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("annonce le message comme alerte", () => {
    render(<FormError message="Email invalide" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Email invalide");
  });
});

describe("FormSuccess", () => {
  it("annonce le message comme statut", () => {
    render(<FormSuccess message="Compte mis à jour" />);
    expect(screen.getByRole("status")).toHaveTextContent("Compte mis à jour");
  });
});
