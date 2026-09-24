import { AppShell } from "@/components/layout/app-shell";
import { getWorkspaceData } from "@/lib/duonest/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const data = await getWorkspaceData();
  return <AppShell userName={data.profile.display_name} homeName={data.home.name} unreadCount={data.notifications.filter((notification) => !notification.read_at).length}>{children}</AppShell>;
}
