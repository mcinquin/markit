import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test-utils/i18n";
import userEvent from "@testing-library/user-event";
import { PhraseChip } from "../phrase-chip";

const phrase = { id: "p1", text: "Tu es en mute", emoji: "🔇", isDefault: false };

describe("PhraseChip", () => {
  it("reflète la sélection et déclenche onClick", async () => {
    const onClick = jest.fn();
    renderWithIntl(<PhraseChip phrase={phrase} selected onClick={onClick} />);

    const chip = screen.getByRole("button", { name: /Tu es en mute/ });
    expect(chip).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(chip);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("n'affiche pas les actions sans handlers (phrase classique)", () => {
    renderWithIntl(<PhraseChip phrase={phrase} selected={false} onClick={jest.fn()} />);
    expect(screen.queryByRole("button", { name: /Modifier/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Supprimer/ })).not.toBeInTheDocument();
  });

  it("déclenche modifier / supprimer sans sélectionner la phrase", async () => {
    const onClick = jest.fn();
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    renderWithIntl(
      <PhraseChip
        phrase={phrase}
        selected={false}
        onClick={onClick}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Modifier « Tu es en mute »" }));
    await userEvent.click(screen.getByRole("button", { name: "Supprimer « Tu es en mute »" }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });
});
