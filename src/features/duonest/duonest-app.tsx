"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  Camera,
  Check,
  Clock,
  Home,
  ListChecks,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn, formatPercent } from "@/lib/utils";
import {
  achievements,
  activities,
  attentionPoints,
  homeStats,
  missions,
  profile,
  shoppingItems,
  tasks as initialTasks,
} from "./sample-data";
import type { ShoppingItem, Task } from "@/types/duonest";

type DuoNestAppProps = {
  view:
    | "dashboard"
    | "tarefas"
    | "calendario"
    | "missoes"
    | "mercado"
    | "pontos"
    | "registros"
    | "conquistas"
    | "perfil"
    | "configuracoes";
};

export function DuoNestApp({ view }: DuoNestAppProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [items, setItems] = useState(shoppingItems);
  const [toast, setToast] = useState("Tudo sincronizado.");

  const completedToday = tasks.filter((task) => task.done).length;
  const progress = formatPercent(completedToday, tasks.length);
  const pendingItems = items.filter((item) => !item.bought).length;

  function toggleTask(task: Task) {
    setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, done: !item.done } : item)));
    setToast(task.done ? "Tarefa reaberta." : `Tarefa concluida! +${task.xp} XP`);
  }

  function toggleItem(item: ShoppingItem) {
    setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, bought: !entry.bought } : entry)));
    setToast(item.bought ? "Item voltou para a lista." : "Lista atualizada em tempo real.");
  }

  const content = useMemo(() => {
    if (view === "dashboard") {
      return (
        <div className="grid gap-5 xl:grid-cols-[1.45fr_0.9fr]">
          <section className="space-y-5">
            <Hero progress={progress} completed={completedToday} total={tasks.length} />
            <TaskList tasks={tasks} onToggle={toggleTask} compact />
            <WeeklyReport />
          </section>
          <section className="space-y-5">
            <MissionPanel />
            <ShoppingPanel items={items} pendingItems={pendingItems} onToggle={toggleItem} compact />
            <ActivityPanel />
          </section>
        </div>
      );
    }

    if (view === "tarefas") {
      return <TaskList tasks={tasks} onToggle={toggleTask} />;
    }

    if (view === "mercado") {
      return <ShoppingPanel items={items} pendingItems={pendingItems} onToggle={toggleItem} />;
    }

    if (view === "missoes") {
      return <MissionsPage />;
    }

    if (view === "calendario") {
      return <CalendarPage />;
    }

    if (view === "pontos") {
      return <AttentionPage />;
    }

    if (view === "registros") {
      return <RecordsPage />;
    }

    if (view === "conquistas") {
      return <AchievementsPage />;
    }

    if (view === "perfil") {
      return <ProfilePage />;
    }

    return <SettingsPage />;
  }, [completedToday, items, pendingItems, progress, tasks, view]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Casa compartilhada</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{titleByView[view]}</h1>
        </div>
        <div className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-900 sm:block">
          {toast}
        </div>
      </div>
      {content}
    </div>
  );
}

const titleByView = {
  dashboard: "Boa tarde, Wendel.",
  tarefas: "Tarefas",
  calendario: "Calendario",
  missoes: "Missoes",
  mercado: "Mercado",
  pontos: "Pontos de atencao",
  registros: "Registros da Casa",
  conquistas: "Conquistas",
  perfil: "Perfil",
  configuracoes: "Configuracoes",
};

function Surface({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-lg border border-slate-200 bg-white p-4 shadow-sm", className)}>{children}</div>;
}

function Hero({ progress, completed, total }: { progress: number; completed: number; total: number }) {
  return (
    <section className="overflow-hidden rounded-lg bg-slate-950 text-white shadow-sm">
      <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[1fr_260px]">
        <div className="space-y-5">
          <div>
            <p className="text-sm text-emerald-200">{profile.homeName}</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight">Nivel da casa {homeStats.level}</h2>
          </div>
          <div>
            <div className="mb-2 flex justify-between text-sm text-slate-300">
              <span>{homeStats.xp.toLocaleString("pt-BR")} XP</span>
              <span>{homeStats.nextLevelXp.toLocaleString("pt-BR")} XP</span>
            </div>
            <Progress value={formatPercent(homeStats.xp, homeStats.nextLevelXp)} className="bg-white/15" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Metric label="Hoje" value={`${completed}/${total}`} />
            <Metric label="Missao" value="2/3" />
            <Metric label="Mercado" value="7 itens" />
          </div>
        </div>
        <div className="rounded-lg bg-white/10 p-4">
          <p className="text-sm text-slate-300">Progresso de hoje</p>
          <p className="mt-2 text-4xl font-semibold">{progress}%</p>
          <Progress value={progress} className="mt-4 bg-white/15" />
          <p className="mt-4 text-sm text-slate-300">Foco em cooperacao: metas da casa contam mais que placares individuais.</p>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/10 p-3">
      <p className="text-xs text-slate-300">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function TaskList({ tasks, onToggle, compact = false }: { tasks: Task[]; onToggle: (task: Task) => void; compact?: boolean }) {
  return (
    <Surface>
      <SectionHeader icon={ListChecks} title={compact ? "Proximas tarefas" : "Tarefas da casa"} action="Nova tarefa" />
      <div className="mt-4 space-y-3">
        {tasks.slice(0, compact ? 4 : tasks.length).map((task) => (
          <button
            key={task.id}
            onClick={() => onToggle(task)}
            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/40"
          >
            <span className={cn("grid size-8 shrink-0 place-items-center rounded-full border", task.done ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-transparent")}>
              <Check size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn("block font-medium", task.done && "text-slate-400 line-through")}>{task.title}</span>
              <span className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                <span>{task.time}</span>
                <span>{task.category}</span>
                <span>{task.responsible}</span>
                {task.recurring ? <span>{task.recurring}</span> : null}
              </span>
            </span>
            <Badge tone={task.priority === "Urgente" ? "red" : task.priority === "Alta" ? "amber" : "neutral"}>{task.priority}</Badge>
            <span className="hidden text-sm font-semibold text-emerald-700 sm:block">+{task.xp} XP</span>
          </button>
        ))}
      </div>
    </Surface>
  );
}

function MissionPanel() {
  const mission = missions[0];
  return (
    <Surface>
      <SectionHeader icon={Sparkles} title="Missao do dia" action="+50 XP" />
      <h3 className="mt-4 font-semibold">{mission.title}</h3>
      <p className="mt-1 text-sm text-slate-500">{mission.description}</p>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span>{mission.progress} / {mission.total} concluidas</span>
        <span className="font-semibold text-emerald-700">+{mission.xp} XP</span>
      </div>
      <Progress value={formatPercent(mission.progress, mission.total)} className="mt-2" />
    </Surface>
  );
}

function ShoppingPanel({ items, pendingItems, onToggle, compact = false }: { items: ShoppingItem[]; pendingItems: number; onToggle: (item: ShoppingItem) => void; compact?: boolean }) {
  return (
    <Surface>
      <SectionHeader icon={ShoppingCart} title="Mercado da Semana" action={`${pendingItems} pendentes`} />
      <div className="mt-4 space-y-2">
        {items.slice(0, compact ? 5 : items.length).map((item) => (
          <button key={item.id} onClick={() => onToggle(item)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50">
            <span className={cn("grid size-6 place-items-center rounded-md border", item.bought ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300")}>
              {item.bought ? <Check size={14} /> : null}
            </span>
            <span className={cn("flex-1 text-sm font-medium", item.bought && "text-slate-400 line-through")}>{item.product}</span>
            <span className="text-xs text-slate-500">{item.quantity}</span>
          </button>
        ))}
      </div>
    </Surface>
  );
}

function ActivityPanel() {
  return (
    <Surface>
      <SectionHeader icon={Clock} title="Atividade" action="Hoje" />
      <div className="mt-4 space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex gap-3">
            <div className="mt-1 size-2 rounded-full bg-emerald-600" />
            <div>
              <p className="text-xs text-slate-500">{activity.time}</p>
              <p className="text-sm">
                <span className="font-semibold">{activity.actor}</span> {activity.action} <span className="font-medium">{activity.detail}</span>
              </p>
              {activity.xp ? <p className="text-xs font-semibold text-emerald-700">+{activity.xp} XP</p> : null}
            </div>
          </div>
        ))}
      </div>
    </Surface>
  );
}

function WeeklyReport() {
  return (
    <Surface>
      <SectionHeader icon={ArrowUpRight} title="Nossa semana" action={`${homeStats.weeklyCompletion}%`} />
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <Stat label="Tarefas concluidas" value={homeStats.completedWeek} />
        <Stat label="Tarefas atrasadas" value={homeStats.delayedWeek} />
        <Stat label="Missoes concluidas" value={8} />
        <Stat label="XP conquistado" value={homeStats.weeklyXp} />
      </div>
    </Surface>
  );
}

function MissionsPage() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {missions.map((mission) => (
        <Surface key={mission.id}>
          <Badge tone={mission.frequency === "Especial" ? "blue" : "green"}>{mission.frequency}</Badge>
          <h2 className="mt-4 text-lg font-semibold">{mission.title}</h2>
          <p className="mt-2 text-sm text-slate-500">{mission.description}</p>
          <Progress value={formatPercent(mission.progress, mission.total)} className="mt-5" />
          <p className="mt-3 text-sm font-semibold text-emerald-700">+{mission.xp} XP</p>
        </Surface>
      ))}
    </div>
  );
}

function CalendarPage() {
  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
  return (
    <Surface>
      <SectionHeader icon={CalendarDays} title="Calendario compartilhado" action="Mes" />
      <div className="mt-5 grid grid-cols-7 gap-2">
        {days.map((day, index) => (
          <div key={day} className="min-h-28 rounded-lg border border-slate-200 p-2">
            <p className="text-xs font-semibold text-slate-500">{day}</p>
            {index === 1 ? <CalendarItem label="Limpar banheiro" /> : null}
            {index === 3 ? <CalendarItem label="Conta de energia" /> : null}
            {index === 5 ? <CalendarItem label="Mercado" /> : null}
          </div>
        ))}
      </div>
    </Surface>
  );
}

function CalendarItem({ label }: { label: string }) {
  return <div className="mt-3 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">{label}</div>;
}

function AttentionPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {attentionPoints.map((point) => (
        <Surface key={point.id}>
          <div className="flex items-start justify-between gap-3">
            <AlertCircle className="text-amber-600" size={22} />
            <Badge tone={point.status === "Resolvido" ? "green" : point.priority === "Urgente" ? "red" : "amber"}>{point.status}</Badge>
          </div>
          <h2 className="mt-4 font-semibold">{point.title}</h2>
          <p className="mt-2 text-sm text-slate-500">{point.category} · {point.owner}</p>
        </Surface>
      ))}
    </div>
  );
}

function RecordsPage() {
  const records = ["Manutencao do filtro registrada", "Comprovante da internet anexado", "Antes/depois da organizacao da sala"];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {records.map((record) => (
        <Surface key={record}>
          <Camera className="text-emerald-700" size={22} />
          <h2 className="mt-4 font-semibold">{record}</h2>
          <p className="mt-2 text-sm text-slate-500">Fotos e anexos usam Supabase Storage com caminho por casa e usuario.</p>
        </Surface>
      ))}
    </div>
  );
}

function AchievementsPage() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {achievements.map((achievement, index) => (
        <Surface key={achievement}>
          <Trophy className={index < 4 ? "text-amber-600" : "text-slate-400"} size={26} />
          <h2 className="mt-4 font-semibold">{achievement}</h2>
          <p className="mt-2 text-sm text-slate-500">{index < 4 ? "Conquista desbloqueada" : "Em progresso"}</p>
        </Surface>
      ))}
    </div>
  );
}

function ProfilePage() {
  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.3fr]">
      <Surface>
        <div className="grid size-20 place-items-center rounded-full bg-emerald-700 text-2xl font-semibold text-white">W</div>
        <h2 className="mt-4 text-xl font-semibold">{profile.name}</h2>
        <p className="text-sm text-slate-500">Nivel {profile.level} · {profile.xp.toLocaleString("pt-BR")} XP</p>
        <Progress value={formatPercent(profile.xp, profile.nextLevelXp)} className="mt-4" />
      </Surface>
      <Surface>
        <SectionHeader icon={ShieldCheck} title="Estatisticas" action={`${profile.streak} dias`} />
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Stat label="Tarefas concluidas" value={profile.completedTasks} />
          <Stat label="Atrasadas" value={profile.delayedTasks} />
          <Stat label="Missoes" value={profile.missions} />
          <Stat label="Sequencia" value={profile.streak} />
        </div>
      </Surface>
    </div>
  );
}

function SettingsPage() {
  const settings = [
    ["Casa", "Nome, imagem, categorias e regras de XP"],
    ["Membros", "Owner, Member, convites e remocao"],
    ["Notificacoes", "Central, preferencias e Web Push futuro"],
  ];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {settings.map(([title, description]) => (
        <Surface key={title}>
          <Home className="text-emerald-700" size={22} />
          <h2 className="mt-4 font-semibold">{title}</h2>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        </Surface>
      ))}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, action }: { icon: typeof Home; title: string; action: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Icon size={18} className="text-emerald-700" />
        <h2 className="font-semibold">{title}</h2>
      </div>
      <span className="text-xs font-semibold text-slate-500">{action}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}
