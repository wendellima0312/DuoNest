import { redirect } from "next/navigation";
import { OnboardingForm } from "@/features/duonest/onboarding-form";
import { getCurrentContext } from "@/lib/duonest/data";

export default async function OnboardingPage() {
  const context = await getCurrentContext();
  if (context.home) redirect("/dashboard");
  return <OnboardingForm initialName={context.profile?.display_name ?? ""} />;
}
