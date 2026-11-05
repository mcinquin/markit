import { useState } from "react";
import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl } from "@/test-utils/i18n";
import userEvent from "@testing-library/user-event";
import { EMOJI_CATEGORIES } from "@/lib/phrase-emojis";
import fr from "@/i18n/messages/fr.json";
import { EmojiPicker } from "../emoji-picker";

function ControlledPicker({ onChange }: { onChange: (emoji: string) => void }) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <div>
      <EmojiPicker
        value={value}
        onChange={(emoji) => {
          setValue(emoji);
          onChange(emoji);
        }}
        open={open}
        onOpenChange={setOpen}
      />
      <p>Dehors</p>
    </div>
  );
}

function setup() {
  const onChange = jest.fn();
  renderWithIntl(<ControlledPicker onChange={onChange} />);
  const trigger = screen.getByRole("button", { name: "Choisir un emoji" });
  return { onChange, trigger, user: userEvent.setup() };
}

const firstEmoji = EMOJI_CATEGORIES[0].emojis[0];

describe("EmojiPicker", () => {
  it("s'ouvre au clic", async () => {
    const { trigger, user } = setup();
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Choisir un emoji")).toBeInTheDocument();
  });

  it("sélectionne un emoji et se referme", async () => {
    const { trigger, onChange, user } = setup();
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: firstEmoji }));

    expect(onChange).toHaveBeenCalledWith(firstEmoji);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveTextContent(firstEmoji);
  });

  it("change de catégorie", async () => {
    const { trigger, user } = setup();
    const second = EMOJI_CATEGORIES[1];
    const secondLabel = fr.emojiPicker.categories[second.id];
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: secondLabel }));

    expect(screen.getByRole("button", { name: secondLabel })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: second.emojis[0] })).toBeInTheDocument();
  });

  it("se ferme avec Échap et au clic extérieur", async () => {
    const { trigger, user } = setup();

    await user.click(trigger);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"));

    await user.click(trigger);
    await user.click(screen.getByText("Dehors"));
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"));
  });
});
