"use client";

import { SessionProvider } from "next-auth/react";
import { NextIntlClientProvider } from "next-intl";
import type { AppLocale } from "@/i18n/config";

type Props = {
  children: React.ReactNode;
  locale: AppLocale;
  messages: React.ComponentProps<typeof NextIntlClientProvider>["messages"];
  timeZone?: string;
};

export function Providers({ children, locale, messages, timeZone }: Props) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      <SessionProvider>{children}</SessionProvider>
    </NextIntlClientProvider>
  );
}
