import { DuoNestApp } from "@/features/duonest/duonest-app";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ novo?: string }> }) {
  const params = await searchParams;
  return <DuoNestApp view="tarefas" initialOpen={params.novo === "1"} />;
}
