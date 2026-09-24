import { AppShell } from "@/components/layout/app-shell";
import { getShellData } from "@/lib/duonest/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const data = await getShellData();
  return <AppShell userName={data.profile.display_name} userAvatar={data.profile.avatar_url} homeName={data.home.name} unreadCount={data.unreadCount}>{children}</AppShell>;
}
