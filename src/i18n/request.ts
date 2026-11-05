import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { getRequestConfig } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type AppLocale } from "./config";

/** Préférence du compte connecté, sinon cookie, sinon français. */
async function resolveLocale(): Promise<AppLocale> {
  const session = await getServerSession(authOptions);
  if (isLocale(session?.user?.locale)) return session.user.locale;

  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
