import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

type Options = Omit<RenderOptions, "wrapper">;

/**
 * Rend un composant sous le provider i18n.
 * En tests DOM, `next-intl` est mocké (messages FR) — le provider est un no-op.
 */
export function renderWithIntl(ui: React.ReactElement, options?: Options) {
  return render(<NextIntlClientProvider locale="fr">{ui}</NextIntlClientProvider>, options);
}
