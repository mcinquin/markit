import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GridSizeInput } from "../grid-size-input";

function setup(value = 5) {
  const onChange = jest.fn();
  render(<GridSizeInput label="Lignes" value={value} onChange={onChange} />);
  return { onChange, input: screen.getByLabelText("Lignes"), user: userEvent.setup() };
}

describe("GridSizeInput", () => {
  it("est relié à son label", () => {
    const { input } = setup();
    expect(input).toHaveValue(5);
  });

  it("propage une valeur valide pendant la saisie", async () => {
    const { input, onChange, user } = setup();
    await user.clear(input);
    await user.type(input, "7");
    expect(onChange).toHaveBeenLastCalledWith(7);
  });

  it("ne propage pas une valeur hors bornes avant le blur", async () => {
    const { input, onChange, user } = setup();
    await user.clear(input);
    await user.type(input, "42");
    expect(onChange).not.toHaveBeenCalledWith(42);
  });

  it("borne la valeur au blur", async () => {
    const { input, onChange, user } = setup();
    await user.clear(input);
    await user.type(input, "42");
    await user.tab();
    expect(onChange).toHaveBeenLastCalledWith(10);
    expect(input).toHaveValue(10);
  });

  it("revient au minimum si le champ est vidé", async () => {
    const { input, onChange, user } = setup();
    await user.clear(input);
    await user.tab();
    expect(onChange).toHaveBeenLastCalledWith(2);
  });
});
