import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/account-guard";
import { AccountSettingsForm } from "@/components/account-settings-form/account-settings-form";

export default async function AccountPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/auth/signin");

  return <AccountSettingsForm initialProfile={profile} />;
}
