import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth/signup-form";

type Props = { searchParams: Promise<{ token?: string | string[] }> };

export default async function SignUpPage({ searchParams }: Props) {
  const { token } = await searchParams;
  if (typeof token !== "string" || !token) redirect("/auth/signin");

  return <SignUpForm inviteToken={token} />;
}
