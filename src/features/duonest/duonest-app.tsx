import { getWorkspaceData } from "@/lib/duonest/data";
import { Workspace } from "./workspace";

export type DuoNestView = "dashboard" | "tarefas" | "calendario" | "missoes" | "mercado" | "financeiro" | "planejamentos" | "historico" | "pontos" | "registros" | "conquistas" | "perfil" | "configuracoes" | "casa" | "membros" | "notificacoes";

export async function DuoNestApp({ view, initialOpen = false }: { view: DuoNestView; initialOpen?: boolean }) {
  const data = await getWorkspaceData(view);
  return <Workspace view={view} data={data} initialOpen={initialOpen} />;
}
