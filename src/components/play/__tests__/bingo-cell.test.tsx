import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test-utils/i18n";
import userEvent from "@testing-library/user-event";
import type { PlayCell } from "@/lib/data";
import { BingoCell } from "../bingo-cell";

const cell: PlayCell = {
  id: "c1",
  position: 0,
  phrase: { id: "p1", text: "On t'entend pas", emoji: "🎧" },
  checked: [],
};

const checkedCell: PlayCell = {
  ...cell,
  checked: [{ id: "k1", userId: "u1", user: { id: "u1", name: "Alice Martin" } }],
};

function renderCell(props: Partial<React.ComponentProps<typeof BingoCell>> = {}) {
  const onClick = jest.fn();
  renderWithIntl(
    <BingoCell
      cell={cell}
      isChecked={false}
      isFree={false}
      isWinning={false}
      onClick={onClick}
      cols={5}
      tilt={0}
      {...props}
    />
  );
  return { onClick, button: screen.getByRole("button") };
}

describe("BingoCell", () => {
  it("affiche la phrase et signale l'état non coché", () => {
    const { button } = renderCell();
    expect(button).toHaveTextContent("On t'entend pas");
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("déclenche onClick", async () => {
    const { button, onClick } = renderCell();
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("affiche le prénom de qui a coché", () => {
    const { button } = renderCell({ cell: checkedCell, isChecked: true });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("rend la case FREE non cliquable", async () => {
    const { button, onClick } = renderCell({ isFree: true, isChecked: true });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("FREE");
    expect(screen.queryByText("On t'entend pas")).not.toBeInTheDocument();

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
