import { Providers } from "@/app/providers";
import { requireAccountReady } from "@/lib/account-guard";

export default async function PlayLayout({ children }: { children: React.ReactNode }) {
  await requireAccountReady();

  return <Providers>{children}</Providers>;
}
