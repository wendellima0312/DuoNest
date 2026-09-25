"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Clock,
  Edit3,
  History,
  Home,
  ListChecks,
  LoaderCircle,
  MapPinned,
  Plus,
  Repeat2,
  ShoppingCart,
  Sparkles,
  Target,
  Timer,
  Trash2,
  Trophy,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { BrandLogo } from "@/components/brand/brand-logo";
import { cn, formatPercent } from "@/lib/utils";
import type {
  AttentionPoint,
  HomeRecord,
  HomeRoom,
  HouseholdExpense,
  HouseholdPlan,
  Mission,
  ScheduleItem,
  ShoppingItem,
  Task,
  WorkspaceData,
} from "@/lib/duonest/types";
import type { DuoNestView } from "./duonest-app";
import { AvatarUpload } from "./avatar-upload";
import { BrowserNotificationControl } from "./browser-notifications";
import {
  createAttentionPoint,
  createExpense,
  createInvite,
  createPlan,
  createRecord,
  createScheduleItem,
  createShoppingItem,
  createTask,
  deleteAttentionPoint,
  deleteExpense,
  deletePlan,
  deleteRecord,
  deleteScheduleItem,
  deleteShoppingItem,
  deleteTask,
  markNotification,
  movePresence,
  removeMember,
  resolveAttentionPoint,
  toggleShoppingItem,
  toggleTask,
  updateAttentionPoint,
  updateHome,
  updateProfile,
  toggleExpense,
  updatePlanStatus,
  updateExpense,
  updatePlan,
  updateRecord,
  updateScheduleItem,
  updateScheduleStatus,
  updateShoppingItem,
  updateTask,
  type ActionResult,
} from "./actions";

type Editor =
  | { kind: "task"; item?: Task }
  | { kind: "shopping"; item?: ShoppingItem }
  | { kind: "attention"; item?: AttentionPoint }
  | { kind: "record"; item?: HomeRecord }
  | { kind: "expense"; item?: HouseholdExpense }
  | { kind: "plan"; item?: HouseholdPlan }
  | { kind: "schedule"; item?: ScheduleItem }
  | null;

const titleByView: Record<DuoNestView, string> = {
  dashboard: "Visão geral",
  tarefas: "Tarefas",
  calendario: "Calendário",
  ocupacao: "Ocupação e tempo",
  missoes: "Missões inteligentes",
  mercado: "Mercado",
  financeiro: "Financeiro",
  planejamentos: "Planejamentos",
  historico: "Histórico compartilhado",
  pontos: "Pontos de atenção",
  registros: "Registros da casa",
  conquistas: "Conquistas",
  perfil: "Perfil",
  configuracoes: "Configurações",
  casa: "Configurações da casa",
  membros: "Membros da casa",
  notificacoes: "Notificações",
};

const modalKindByView: Partial<
  Record<DuoNestView, NonNullable<Editor>["kind"]>
> = {
  tarefas: "task",
  ocupacao: "schedule",
  mercado: "shopping",
  pontos: "attention",
  registros: "record",
  financeiro: "expense",
  planejamentos: "plan",
};

export function Workspace({
  view,
  data,
  initialOpen,
}: {
  view: DuoNestView;
  data: WorkspaceData;
  initialOpen: boolean;
}) {
  const router = useRouter();
  const initialKind = initialOpen ? modalKindByView[view] : undefined;
  const [editor, setEditor] = useState<Editor>(
    initialKind ? ({ kind: initialKind } as Editor) : null,
  );
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: Promise<ActionResult>, close = false) {
    startTransition(async () => {
      const result = await action;
      setFeedback(result);
      if (result.ok && close) setEditor(null);
      if (result.ok) router.refresh();
    });
  }

  function confirmDelete(label: string, action: Promise<ActionResult>) {
    if (window.confirm(`Remover ${label}? Esta ação não pode ser desfeita.`))
      run(action);
  }

  const addKind = modalKindByView[view];
  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500 dark:text-neutral-400">
            {data.home.name}
          </p>
          <h1 className="text-2xl font-semibold sm:text-3xl">
            {titleByView[view]}
          </h1>
        </div>
        {addKind ? (
          <button
            onClick={() => setEditor({ kind: addKind } as Editor)}
            className="flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            <Plus size={17} />
            <span className="hidden sm:inline">Adicionar</span>
          </button>
        ) : null}
      </header>
      {feedback ? (
        <div
          role={feedback.ok ? "status" : "alert"}
          className={cn(
            "flex items-center justify-between rounded-lg px-4 py-3 text-sm",
            feedback.ok
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
          )}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            aria-label="Fechar mensagem"
          >
            <X size={17} />
          </button>
        </div>
      ) : null}
      {pending ? (
        <div className="fixed bottom-24 right-4 z-50 flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm text-white shadow-lg dark:bg-white dark:text-black">
          <LoaderCircle className="animate-spin" size={16} />
          Salvando
        </div>
      ) : null}

      {view === "dashboard" ? <Dashboard data={data} run={run} /> : null}
      {view === "tarefas" ? (
        <Tasks
          data={data}
          run={run}
          edit={(item) => setEditor({ kind: "task", item })}
          remove={(item) =>
            confirmDelete(`a tarefa “${item.title}”`, deleteTask(item.id))
          }
        />
      ) : null}
      {view === "ocupacao" ? (
        <Occupation
          data={data}
          run={run}
          edit={(item) => setEditor({ kind: "schedule", item })}
          remove={(item) =>
            confirmDelete(
              `a atividade “${item.title}”`,
              deleteScheduleItem(item.id),
            )
          }
        />
      ) : null}
      {view === "mercado" ? (
        <Shopping
          data={data}
          run={run}
          edit={(item) => setEditor({ kind: "shopping", item })}
          remove={(item) =>
            confirmDelete(`“${item.product}”`, deleteShoppingItem(item.id))
          }
        />
      ) : null}
      {view === "financeiro" ? (
        <Finance
          data={data}
          run={run}
          edit={(item) => setEditor({ kind: "expense", item })}
          remove={(item) =>
            confirmDelete(
              `o gasto “${item.description}”`,
              deleteExpense(item.id),
            )
          }
        />
      ) : null}
      {view === "planejamentos" ? (
        <Plans
          data={data}
          run={run}
          edit={(item) => setEditor({ kind: "plan", item })}
          remove={(item) =>
            confirmDelete(`o planejamento “${item.title}”`, deletePlan(item.id))
          }
        />
      ) : null}
      {view === "historico" ? <HistoryView data={data} /> : null}
      {view === "missoes" ? <Missions data={data} /> : null}
      {view === "calendario" ? <Calendar data={data} /> : null}
      {view === "pontos" ? (
        <Attention
          data={data}
          run={run}
          edit={(item) => setEditor({ kind: "attention", item })}
          remove={(item) =>
            confirmDelete(`“${item.title}”`, deleteAttentionPoint(item.id))
          }
        />
      ) : null}
      {view === "registros" ? (
        <Records
          data={data}
          edit={(item) => setEditor({ kind: "record", item })}
          remove={(item) =>
            confirmDelete(`“${item.title}”`, deleteRecord(item.id))
          }
        />
      ) : null}
      {view === "conquistas" ? <Achievements data={data} /> : null}
      {view === "perfil" ? <Profile data={data} run={run} /> : null}
      {view === "configuracoes" ? <SettingsIndex /> : null}
      {view === "casa" ? <HomeSettings data={data} run={run} /> : null}
      {view === "membros" ? (
        <Members
          data={data}
          run={run}
          remove={(id, name) =>
            confirmDelete(`o acesso de ${name}`, removeMember(id))
          }
        />
      ) : null}
      {view === "notificacoes" ? <Notifications data={data} run={run} /> : null}

      {editor ? (
        <EditorModal
          editor={editor}
          data={data}
          close={() => setEditor(null)}
          submit={(formData) => {
            const action =
              editor.kind === "task"
                ? editor.item
                  ? updateTask(formData)
                  : createTask(formData)
                : editor.kind === "shopping"
                  ? editor.item
                    ? updateShoppingItem(formData)
                    : createShoppingItem(formData)
                  : editor.kind === "attention"
                    ? editor.item
                      ? updateAttentionPoint(formData)
                      : createAttentionPoint(formData)
                    : editor.kind === "record"
                      ? editor.item
                        ? updateRecord(formData)
                        : createRecord(formData)
                      : editor.kind === "expense"
                        ? editor.item
                          ? updateExpense(formData)
                          : createExpense(formData)
                        : editor.kind === "plan"
                          ? editor.item
                            ? updatePlan(formData)
                            : createPlan(formData)
                          : editor.item
                            ? updateScheduleItem(formData)
                            : createScheduleItem(formData);
            run(action, true);
          }}
        />
      ) : null}
    </div>
  );
}

function Surface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900",
        className,
      )}
    >
      {children}
    </section>
  );
}

function Empty({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Home;
  title: string;
  text: string;
}) {
  return (
    <div className="grid min-h-48 place-items-center text-center">
      <div>
        <Icon
          className="mx-auto text-slate-300 dark:text-neutral-600"
          size={32}
        />
        <h2 className="mt-3 font-semibold">{title}</h2>
        <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-neutral-400">
          {text}
        </p>
      </div>
    </div>
  );
}

function Dashboard({
  data,
  run,
}: {
  data: WorkspaceData;
  run: (action: Promise<ActionResult>) => void;
}) {
  const openTasks = data.tasks.filter((task) => task.status !== "resolved");
  const doneTasks = data.tasks.length - openTasks.length;
  const pendingItems = data.shoppingItems.filter((item) => !item.bought);
  const nextXp = Math.max(data.home.xp + 500, (data.home.level + 1) * 600);
  return (
    <div className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
      <div className="space-y-5">
        <section className="overflow-hidden rounded-lg bg-neutral-950 p-5 text-white shadow-sm sm:p-6 dark:border dark:border-neutral-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-emerald-300">
                Nível da casa {data.home.level}
              </p>
              <h2 className="mt-2 text-3xl font-semibold">
                {data.home.xp.toLocaleString("pt-BR")} XP
              </h2>
              <p className="mt-1 text-sm text-neutral-400">
                A rotina cresce com a colaboração.
              </p>
            </div>
            <BrandLogo size={76} className="shadow-lg ring-1 ring-white/20" />
          </div>
          <div className="mt-4 flex justify-end">
            <span className="text-sm text-neutral-400">
              Meta {nextXp.toLocaleString("pt-BR")}
            </span>
          </div>
          <Progress
            value={formatPercent(data.home.xp, nextXp)}
            className="mt-2 bg-white/15"
          />
          <div className="mt-5 grid grid-cols-3 gap-2">
            <Metric label="Concluídas" value={doneTasks} />
            <Metric label="Pendentes" value={openTasks.length} />
            <Metric label="Mercado" value={pendingItems.length} />
          </div>
        </section>
        <Surface>
          <SectionTitle
            icon={ListChecks}
            title="Próximas tarefas"
            href="/tarefas"
          />
          <div className="mt-3 space-y-2">
            {openTasks.slice(0, 5).map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                data={data}
                toggle={() => run(toggleTask(task.id, true))}
              />
            ))}
            {!openTasks.length ? (
              <Empty
                icon={CheckCircle2}
                title="Tudo em dia"
                text="Novas tarefas aparecerão aqui."
              />
            ) : null}
          </div>
        </Surface>
        <Surface>
          <SectionTitle icon={Clock} title="Atividade recente" />
          <ActivityList data={data} />
        </Surface>
      </div>
      <div className="space-y-5">
        <Surface>
          <SectionTitle
            icon={Sparkles}
            title="Missões inteligentes"
            href="/missoes"
          />
          {data.missions.slice(0, 3).map((mission) => (
            <MissionRow
              key={mission.id}
              mission={mission}
              completed={data.missionCompletionIds.includes(mission.id)}
              data={data}
            />
          ))}
          {!data.missions.length ? (
            <Empty
              icon={Sparkles}
              title="Analisando sua rotina"
              text="As próximas metas serão geradas pelo seu progresso."
            />
          ) : null}
        </Surface>
        <Surface>
          <SectionTitle
            icon={ShoppingCart}
            title="Lista de mercado"
            href="/mercado"
          />
          {pendingItems.slice(0, 6).map((item) => (
            <ShoppingRow
              key={item.id}
              item={item}
              toggle={() => run(toggleShoppingItem(item.id, true))}
            />
          ))}
          {!pendingItems.length ? (
            <Empty
              icon={ShoppingCart}
              title="Lista vazia"
              text="Adicione os próximos itens da casa."
            />
          ) : null}
        </Surface>
      </div>
    </div>
  );
}

function Tasks({
  data,
  run,
  edit,
  remove,
}: {
  data: WorkspaceData;
  run: (a: Promise<ActionResult>) => void;
  edit: (t: Task) => void;
  remove: (t: Task) => void;
}) {
  const [tab, setTab] = useState<"open" | "completed" | "missed">("open");
  const openTasks = data.tasks.filter(
    (task) => task.status !== "resolved" && !isTaskOverdue(task),
  );
  const overdueTasks = data.tasks.filter(isTaskOverdue);
  const missedCycles = data.activities.filter(
    (activity) => activity.action === "nao concluiu uma tarefa no prazo",
  );
  const unrecordedOverdueTasks = overdueTasks.filter(
    (task) =>
      !missedCycles.some(
        (cycle) =>
          cycle.entity_id === task.id &&
          String(cycle.metadata.cycle_due_at ?? "") === task.due_at,
      ),
  );
  const tabs = [
    { id: "open" as const, label: "Abertas", count: openTasks.length },
    {
      id: "completed" as const,
      label: "Concluídas",
      count: data.taskCompletions.length,
    },
    {
      id: "missed" as const,
      label: "Não concluídas",
      count: missedCycles.length + unrecordedOverdueTasks.length,
    },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 rounded-lg border border-slate-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "min-h-11 rounded-md px-2 text-sm font-semibold",
              tab === item.id
                ? "bg-emerald-700 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
            )}
          >
            <span className="hidden sm:inline">{item.label}</span>
            <span className="sm:hidden">
              {item.id === "open"
                ? "Abertas"
                : item.id === "completed"
                  ? "Feitas"
                  : "Atrasadas"}
            </span>{" "}
            <span className="opacity-75">{item.count}</span>
          </button>
        ))}
      </div>
      <Surface>
        {tab === "open" ? (
          openTasks.length ? (
            <div className="divide-y divide-slate-100 dark:divide-neutral-800">
              {openTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-2 py-3">
                  <TaskRow
                    task={task}
                    data={data}
                    toggle={() => run(toggleTask(task.id, true))}
                    className="flex-1"
                  />
                  <IconButton label="Editar tarefa" onClick={() => edit(task)}>
                    <Edit3 size={17} />
                  </IconButton>
                  <IconButton
                    label="Excluir tarefa"
                    danger
                    onClick={() => remove(task)}
                  >
                    <Trash2 size={17} />
                  </IconButton>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              icon={CheckCircle2}
              title="Nenhuma tarefa aberta"
              text="A rotina está livre por enquanto."
            />
          )
        ) : null}
        {tab === "completed" ? (
          data.taskCompletions.length ? (
            <div className="divide-y divide-slate-100 dark:divide-neutral-800">
              {data.taskCompletions.map((completion) => {
                const task = data.tasks.find(
                  (item) => item.id === completion.task_id,
                );
                const member = data.members.find(
                  (item) => item.user_id === completion.completed_by,
                );
                return (
                  <TaskCycleRow
                    key={completion.id}
                    title={task?.title ?? "Tarefa removida"}
                    detail={`Concluída em ${dateLabel(completion.completed_at, true)} · +${completion.xp_awarded} XP`}
                    member={member}
                    tone="completed"
                  />
                );
              })}
            </div>
          ) : (
            <Empty
              icon={CheckCircle2}
              title="Nenhuma tarefa concluída"
              text="Cada conclusão ficará registrada aqui."
            />
          )
        ) : null}
        {tab === "missed" ? (
          missedCycles.length || overdueTasks.length ? (
            <div className="divide-y divide-slate-100 dark:divide-neutral-800">
              {unrecordedOverdueTasks.map((task) => {
                const canExtend = task.created_by === data.userId;
                return (
                  <div
                    key={`current-${task.id}`}
                    className="flex items-center gap-2 py-3"
                  >
                    <TaskRow
                      task={task}
                      data={data}
                      toggle={() => undefined}
                      className="flex-1"
                    />
                    {canExtend ? (
                      <IconButton
                        label="Prorrogar prazo"
                        onClick={() => edit(task)}
                      >
                        <CalendarDays size={17} />
                      </IconButton>
                    ) : null}
                    <IconButton
                      label="Excluir tarefa"
                      danger
                      onClick={() => remove(task)}
                    >
                      <Trash2 size={17} />
                    </IconButton>
                  </div>
                );
              })}
              {missedCycles.map((cycle) => {
                  const task = data.tasks.find(
                    (item) => item.id === cycle.entity_id,
                  );
                  const xpLost = Number(cycle.metadata.xp_lost ?? 0);
                  return (
                    <TaskCycleRow
                      key={cycle.id}
                      title={task?.title ?? "Tarefa removida"}
                      detail={`Prazo perdido em ${dateLabel(String(cycle.metadata.cycle_due_at ?? cycle.created_at), true)} · -${xpLost} XP`}
                      tone="missed"
                    />
                  );
                })}
            </div>
          ) : (
            <Empty
              icon={Clock}
              title="Nenhuma tarefa perdida"
              text="Os prazos não cumpridos aparecerão aqui."
            />
          )
        ) : null}
      </Surface>
    </div>
  );
}

function TaskCycleRow({
  title,
  detail,
  member,
  tone,
}: {
  title: string;
  detail: string;
  member?: WorkspaceData["members"][number];
  tone: "completed" | "missed";
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full",
          tone === "completed"
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950"
            : "bg-red-100 text-red-700 dark:bg-red-950",
        )}
      >
        {tone === "completed" ? <Check size={17} /> : <Clock size={17} />}
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-sm">{title}</strong>
        <small className="text-slate-500 dark:text-neutral-400">{detail}</small>
      </span>
      {member ? (
        <Avatar
          name={member.profile.display_name}
          src={member.profile.avatar_url}
          config={member.profile.avatar_config}
          size={32}
        />
      ) : null}
    </div>
  );
}

function TaskRow({
  task,
  data,
  toggle,
  className,
}: {
  task: Task;
  data: WorkspaceData;
  toggle: () => void;
  className?: string;
}) {
  const overdue = isTaskOverdue(task);
  const responsibles = task.assigned_to
    ? data.members.filter((item) => item.user_id === task.assigned_to)
    : task.assignment === "self"
      ? data.members.filter((item) => item.user_id === data.userId)
      : task.assignment === "partner"
        ? data.members
            .filter((item) => item.user_id !== data.userId)
            .slice(0, 1)
        : data.members;
  const responsibleLabel = responsibles.length
    ? responsibles.map((item) => item.profile.display_name).join(", ")
    : assignmentLabel(task.assignment);

  return (
    <button
      onClick={toggle}
      disabled={overdue}
      title={
        overdue
          ? "O criador precisa prorrogar o prazo antes da conclusão"
          : undefined
      }
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-lg p-2 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-red-50/60 dark:hover:bg-neutral-800 dark:disabled:bg-red-950/20",
        className,
      )}
    >
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full border",
          task.status === "resolved"
            ? "border-emerald-600 bg-emerald-600 text-white"
            : overdue
              ? "border-red-400 text-red-600"
              : "border-slate-300 dark:border-neutral-600",
        )}
      >
        <Check
          size={16}
          className={task.status === "resolved" ? "" : "opacity-0"}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate font-medium",
            task.status === "resolved" && "text-slate-400 line-through",
          )}
        >
          {task.title}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-neutral-400">
          <span>{task.category}</span>
          <span
            className={cn(
              "inline-flex items-center gap-1",
              overdue && "font-semibold text-red-600 dark:text-red-400",
            )}
          >
            <CalendarDays size={13} />
            {overdue
              ? "Prazo vencido: conclusão bloqueada"
              : task.due_at
                ? `Prazo ${dateLabel(task.due_at, true)}`
                : "Sem prazo"}
          </span>
          {task.recurrence !== "none" ? (
            <span className="inline-flex items-center gap-1">
              <Repeat2 size={13} />
              {recurrenceLabel(task.recurrence)}
            </span>
          ) : null}
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <span className="flex shrink-0 -space-x-1">
              {responsibles.slice(0, 3).map((item) => (
                <Avatar
                  key={item.id}
                  name={item.profile.display_name}
                  src={item.profile.avatar_url}
                  config={item.profile.avatar_config}
                  size={20}
                  className="ring-2 ring-white dark:ring-neutral-900"
                />
              ))}
            </span>
            <span className="truncate">{responsibleLabel}</span>
          </span>
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
            +{task.xp} XP
          </span>
          <span className="font-semibold text-red-600 dark:text-red-400">
            -{task.xp} se atrasar
          </span>
        </span>
      </span>
      <Badge
        tone={
          overdue || task.priority === "urgent"
            ? "red"
            : task.priority === "high"
              ? "amber"
              : "neutral"
        }
      >
        {overdue ? "Bloqueada" : priorityLabel(task.priority)}
      </Badge>
    </button>
  );
}

const homeRooms: Array<{ room: HomeRoom; className: string }> = [
  {
    room: "Sala",
    className: "col-span-2 row-span-2 bg-emerald-50 dark:bg-emerald-950/30",
  },
  { room: "Cozinha", className: "bg-amber-50 dark:bg-amber-950/30" },
  { room: "Banheiro", className: "bg-sky-50 dark:bg-sky-950/30" },
  {
    room: "Quarto",
    className: "col-span-2 bg-violet-50 dark:bg-violet-950/30",
  },
  { room: "Escritorio", className: "bg-rose-50 dark:bg-rose-950/30" },
  {
    room: "Area externa",
    className: "col-span-2 bg-lime-50 dark:bg-lime-950/30",
  },
];

function Occupation({
  data,
  run,
  edit,
  remove,
}: {
  data: WorkspaceData;
  run: (a: Promise<ActionResult>) => void;
  edit: (item: ScheduleItem) => void;
  remove: (item: ScheduleItem) => void;
}) {
  const today = new Date();
  const todayKey = localDayKey(today);
  const isWeekend = today.getDay() === 0 || today.getDay() === 6;
  const [scope, setScope] = useState<"today" | "business_days" | "weekends">(
    "today",
  );
  const items = data.scheduleItems
    .filter((item) =>
      scope === "today"
        ? item.day_scope === "anyday" ||
          item.scheduled_date === todayKey ||
          item.day_scope === (isWeekend ? "weekends" : "business_days")
        : item.day_scope === scope,
    )
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  const totalMinutes = items
    .filter((item) => item.status === "planned")
    .reduce((total, item) => total + item.duration_minutes, 0);
  const alignedTasks = data.tasks.filter(
    (task) =>
      task.status !== "resolved" &&
      task.due_at &&
      localDayKey(new Date(task.due_at)) === todayKey,
  );
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1.1fr]">
      <div className="space-y-5">
        <Surface>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Casa agora</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
                Toque em um cômodo para mover seu avatar.
              </p>
            </div>
            <MapPinned
              className="text-emerald-700 dark:text-emerald-400"
              size={22}
            />
          </div>
          <div className="mt-4 grid auto-rows-[92px] grid-cols-3 gap-2">
            {homeRooms.map(({ room, className }) => {
              const occupants = data.members.filter(
                (member) =>
                  data.presence.find(
                    (presence) => presence.user_id === member.user_id,
                  )?.room === room,
              );
              const current =
                data.presence.find(
                  (presence) => presence.user_id === data.userId,
                )?.room === room;
              return (
                <button
                  key={room}
                  onClick={() => run(movePresence(room))}
                  className={cn(
                    "relative flex min-w-0 flex-col justify-between rounded-lg border p-3 text-left transition hover:border-emerald-500",
                    className,
                    current
                      ? "border-emerald-600 ring-2 ring-emerald-600/20"
                      : "border-slate-200 dark:border-neutral-700",
                  )}
                >
                  <span className="truncate text-xs font-semibold sm:text-sm">
                    {roomLabel(room)}
                  </span>
                  <span className="flex -space-x-2">
                    {occupants.map((member) => (
                      <Avatar
                        key={member.id}
                        name={member.profile.display_name}
                        src={member.profile.avatar_url}
                        config={member.profile.avatar_config}
                        size={34}
                        className="ring-2 ring-white dark:ring-neutral-900"
                      />
                    ))}
                  </span>
                  {current ? (
                    <span className="absolute right-2 top-2 size-2 rounded-full bg-emerald-600" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </Surface>
        <Surface>
          <SectionTitle
            icon={ListChecks}
            title="Afazeres de hoje"
            href="/tarefas"
          />
          <div className="mt-3 space-y-2">
            {alignedTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                data={data}
                toggle={() => run(toggleTask(task.id, true))}
              />
            ))}
            {!alignedTasks.length ? (
              <p className="py-4 text-sm text-slate-500 dark:text-neutral-400">
                Nenhum prazo marcado para hoje.
              </p>
            ) : null}
          </div>
        </Surface>
      </div>
      <Surface>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Planejamento do casal</h2>
            <p className="mt-1 flex items-center gap-1 text-sm text-slate-500 dark:text-neutral-400">
              <Timer size={15} />
              {durationLabel(totalMinutes)} ainda planejados
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 rounded-lg bg-slate-100 p-1 dark:bg-neutral-800">
          {[
            ["today", "Hoje"],
            ["business_days", "Dias úteis"],
            ["weekends", "Fim de semana"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setScope(value as typeof scope)}
              className={cn(
                "min-h-10 rounded-md px-2 text-xs font-semibold sm:text-sm",
                scope === value
                  ? "bg-white text-emerald-800 shadow-sm dark:bg-neutral-950 dark:text-emerald-300"
                  : "text-slate-500 dark:text-neutral-400",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {items.length ? (
          <div className="mt-4 divide-y divide-slate-100 dark:divide-neutral-800">
            {items.map((item) => {
              const responsible = data.members.find(
                (member) => member.user_id === item.responsible_id,
              );
              return (
                <div key={item.id} className="flex items-center gap-3 py-3">
                  <button
                    onClick={() =>
                      run(
                        updateScheduleStatus(
                          item.id,
                          item.status === "completed" ? "planned" : "completed",
                        ),
                      )
                    }
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-full border",
                      item.status === "completed"
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-300 dark:border-neutral-600",
                    )}
                    aria-label={
                      item.status === "completed"
                        ? "Reabrir atividade"
                        : "Concluir atividade"
                    }
                  >
                    {item.status === "completed" ? <Check size={16} /> : null}
                  </button>
                  <span className="w-12 shrink-0 text-sm font-semibold">
                    {item.start_time.slice(0, 5)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong
                      className={cn(
                        "block truncate text-sm",
                        item.status === "completed" &&
                          "text-slate-400 line-through",
                      )}
                    >
                      {item.title}
                    </strong>
                    <small className="flex flex-wrap items-center gap-x-2 text-slate-500 dark:text-neutral-400">
                      <span>{item.duration_minutes} min</span>
                      <span>{roomLabel(item.room)}</span>
                      {item.scheduled_date ? (
                        <span>{dateLabel(item.scheduled_date)}</span>
                      ) : null}
                    </small>
                  </span>
                  {responsible ? (
                    <Avatar
                      name={responsible.profile.display_name}
                      src={responsible.profile.avatar_url}
                      config={responsible.profile.avatar_config}
                      size={30}
                    />
                  ) : (
                    <Users className="shrink-0 text-slate-400" size={19} />
                  )}
                  <IconButton
                    label="Editar atividade"
                    onClick={() => edit(item)}
                  >
                    <Edit3 size={17} />
                  </IconButton>
                  <IconButton
                    label="Excluir atividade"
                    danger
                    onClick={() => remove(item)}
                  >
                    <Trash2 size={17} />
                  </IconButton>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty
            icon={CalendarDays}
            title="Agenda livre"
            text="Adicione uma atividade para alinhar o tempo do casal."
          />
        )}
      </Surface>
    </div>
  );
}

function Shopping({
  data,
  run,
  edit,
  remove,
}: {
  data: WorkspaceData;
  run: (a: Promise<ActionResult>) => void;
  edit: (i: ShoppingItem) => void;
  remove: (i: ShoppingItem) => void;
}) {
  return (
    <Surface>
      {data.shoppingItems.length ? (
        <div className="divide-y divide-slate-100 dark:divide-neutral-800">
          {data.shoppingItems.map((item) => (
            <div key={item.id} className="flex items-center gap-2 py-2">
              <ShoppingRow
                item={item}
                toggle={() => run(toggleShoppingItem(item.id, !item.bought))}
                className="flex-1"
              />
              <IconButton label="Editar item" onClick={() => edit(item)}>
                <Edit3 size={17} />
              </IconButton>
              <IconButton
                label="Excluir item"
                danger
                onClick={() => remove(item)}
              >
                <Trash2 size={17} />
              </IconButton>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          icon={ShoppingCart}
          title="Lista vazia"
          text="Adicione o primeiro produto."
        />
      )}
    </Surface>
  );
}

function ShoppingRow({
  item,
  toggle,
  className,
}: {
  item: ShoppingItem;
  toggle: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={toggle}
      className={cn(
        "flex min-h-11 min-w-0 items-center gap-3 rounded-lg px-2 text-left hover:bg-slate-50 dark:hover:bg-neutral-800",
        className,
      )}
    >
      <span
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-md border",
          item.bought
            ? "border-emerald-600 bg-emerald-600 text-white"
            : "border-slate-300 dark:border-neutral-600",
        )}
      >
        {item.bought ? <Check size={14} /> : null}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm font-medium",
          item.bought && "text-slate-400 line-through",
        )}
      >
        {item.product}
      </span>
      <span className="shrink-0 text-xs text-slate-500 dark:text-neutral-400">
        {item.quantity}
      </span>
    </button>
  );
}

function Finance({
  data,
  run,
  edit,
  remove,
}: {
  data: WorkspaceData;
  run: (a: Promise<ActionResult>) => void;
  edit: (i: HouseholdExpense) => void;
  remove: (i: HouseholdExpense) => void;
}) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const expenses = data.expenses.filter((item) =>
    item.expense_date.startsWith(month),
  );
  const total = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const paid = expenses
    .filter((item) => item.status === "paid")
    .reduce((sum, item) => sum + Number(item.amount), 0);
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <FinanceMetric label="Total do mês" value={total} icon={WalletCards} />
        <FinanceMetric label="Pago" value={paid} icon={CheckCircle2} />
        <FinanceMetric label="Pendente" value={total - paid} icon={Clock} />
      </div>
      <Surface>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Gastos do mês</h2>
          <label className="text-sm font-medium">
            Mês
            <input
              aria-label="Mês dos gastos"
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="ml-2 h-10 rounded-lg border border-slate-300 bg-white px-3 dark:border-neutral-700 dark:bg-neutral-950"
            />
          </label>
        </div>
        {expenses.length ? (
          <div className="mt-4 divide-y divide-slate-100 dark:divide-neutral-800">
            {expenses.map((item) => {
              const payer = data.members.find(
                (member) => member.user_id === item.paid_by,
              );
              return (
                <div key={item.id} className="flex items-center gap-3 py-3">
                  <button
                    onClick={() =>
                      run(toggleExpense(item.id, item.status !== "paid"))
                    }
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-full border",
                      item.status === "paid"
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-300",
                    )}
                    aria-label={
                      item.status === "paid"
                        ? "Marcar como pendente"
                        : "Marcar como pago"
                    }
                  >
                    {item.status === "paid" ? <Check size={16} /> : null}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.description}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{item.category}</span>
                      <span>{dateLabel(item.expense_date)}</span>
                      {payer ? (
                        <span className="inline-flex items-center gap-1">
                          <Avatar
                            name={payer.profile.display_name}
                            src={payer.profile.avatar_url}
                            config={payer.profile.avatar_config}
                            size={18}
                          />
                          {payer.profile.display_name}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <strong className="shrink-0 text-sm">
                    {money(item.amount)}
                  </strong>
                  <IconButton label="Editar gasto" onClick={() => edit(item)}>
                    <Edit3 size={17} />
                  </IconButton>
                  <IconButton
                    label="Excluir gasto"
                    danger
                    onClick={() => remove(item)}
                  >
                    <Trash2 size={17} />
                  </IconButton>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty
            icon={CircleDollarSign}
            title="Nenhum gasto neste mês"
            text="Registre contas, compras e despesas compartilhadas."
          />
        )}
      </Surface>
    </div>
  );
}

function FinanceMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Home;
}) {
  return (
    <Surface className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
        <Icon size={20} />
      </span>
      <span>
        <small className="text-slate-500">{label}</small>
        <strong className="block text-lg">{money(value)}</strong>
      </span>
    </Surface>
  );
}

function Plans({
  data,
  run,
  edit,
  remove,
}: {
  data: WorkspaceData;
  run: (a: Promise<ActionResult>) => void;
  edit: (i: HouseholdPlan) => void;
  remove: (i: HouseholdPlan) => void;
}) {
  return data.plans.length ? (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {data.plans.map((plan) => {
        const responsible = data.members.find(
          (member) => member.user_id === plan.responsible_id,
        );
        return (
          <Surface key={plan.id}>
            <div className="flex items-start justify-between gap-3">
              <Badge
                tone={
                  plan.status === "completed"
                    ? "green"
                    : plan.status === "cancelled"
                      ? "red"
                      : plan.status === "in_progress"
                        ? "blue"
                        : "neutral"
                }
              >
                {planStatusLabel(plan.status)}
              </Badge>
              <div className="flex">
                <IconButton
                  label="Editar planejamento"
                  onClick={() => edit(plan)}
                >
                  <Edit3 size={17} />
                </IconButton>
                <IconButton
                  label="Excluir planejamento"
                  danger
                  onClick={() => remove(plan)}
                >
                  <Trash2 size={17} />
                </IconButton>
              </div>
            </div>
            <ClipboardList
              className="mt-4 text-emerald-700 dark:text-emerald-400"
              size={22}
            />
            <h2 className="mt-3 text-lg font-semibold">{plan.title}</h2>
            <p className="mt-2 min-h-10 text-sm text-slate-500 dark:text-neutral-400">
              {plan.description || planTypeLabel(plan.plan_type)}
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <p>
                {plan.target_date
                  ? `Meta: ${dateLabel(plan.target_date)}`
                  : "Sem data definida"}
              </p>
              {plan.estimated_cost !== null ? (
                <p className="font-semibold">
                  Estimativa: {money(plan.estimated_cost)}
                </p>
              ) : null}
              {responsible ? (
                <p className="flex items-center gap-2 text-slate-500">
                  <Avatar
                    name={responsible.profile.display_name}
                    src={responsible.profile.avatar_url}
                    config={responsible.profile.avatar_config}
                    size={24}
                  />
                  {responsible.profile.display_name}
                </p>
              ) : null}
            </div>
            <select
              aria-label={`Andamento de ${plan.title}`}
              value={plan.status}
              onChange={(event) =>
                run(
                  updatePlanStatus(
                    plan.id,
                    event.target.value as HouseholdPlan["status"],
                  ),
                )
              }
              className="mt-5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-950"
            >
              <option value="planned">Planejado</option>
              <option value="in_progress">Em andamento</option>
              <option value="completed">Concluído</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </Surface>
        );
      })}
    </div>
  ) : (
    <Surface>
      <Empty
        icon={ClipboardList}
        title="Nenhum planejamento"
        text="Organize compras, melhorias e manutenções da casa."
      />
    </Surface>
  );
}

function HistoryView({ data }: { data: WorkspaceData }) {
  const completedIds = new Set(
    data.taskCompletions.map((item) => item.task_id),
  );
  const completed = data.tasks.filter(
    (task) => completedIds.has(task.id) || task.status === "resolved",
  );
  const pending = data.tasks.filter(
    (task) => !completedIds.has(task.id) && task.status !== "resolved",
  );
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <div className="space-y-5">
        <Surface>
          <SectionTitle
            icon={CheckCircle2}
            title={`Concluídas (${completed.length})`}
          />
          <div className="mt-3 space-y-2">
            {completed.map((task) => (
              <HistoryTask key={task.id} task={task} data={data} done />
            ))}
            {!completed.length ? (
              <p className="text-sm text-slate-500">
                Nenhuma tarefa concluída.
              </p>
            ) : null}
          </div>
        </Surface>
        <Surface>
          <SectionTitle
            icon={Clock}
            title={`Não concluídas (${pending.length})`}
          />
          <div className="mt-3 space-y-2">
            {pending.map((task) => (
              <HistoryTask key={task.id} task={task} data={data} />
            ))}
            {!pending.length ? (
              <p className="text-sm text-slate-500">Nenhuma tarefa pendente.</p>
            ) : null}
          </div>
        </Surface>
      </div>
      <Surface>
        <SectionTitle icon={History} title="Todas as ações" />
        <ActivityList data={data} />
      </Surface>
    </div>
  );
}

function HistoryTask({
  task,
  data,
  done = false,
}: {
  task: Task;
  data: WorkspaceData;
  done?: boolean;
}) {
  const completion = data.taskCompletions.find(
    (item) => item.task_id === task.id,
  );
  const responsible = data.members.find(
    (member) =>
      member.user_id === (completion?.completed_by ?? task.assigned_to),
  );
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-neutral-700">
      <span
        className={cn(
          "grid size-8 place-items-center rounded-full",
          done
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950"
            : isTaskOverdue(task)
              ? "bg-red-100 text-red-700 dark:bg-red-950"
              : "bg-slate-100 text-slate-500 dark:bg-neutral-800",
        )}
      >
        {done ? <Check size={16} /> : <Clock size={16} />}
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-sm">{task.title}</strong>
        <small className="text-slate-500">
          {completion
            ? `Concluída em ${dateLabel(completion.completed_at, true)}`
            : isTaskOverdue(task)
              ? "Prazo vencido"
              : task.due_at
                ? `Prazo ${dateLabel(task.due_at, true)}`
                : "Sem prazo"}
        </small>
      </span>
      {responsible ? (
        <Avatar
          name={responsible.profile.display_name}
          src={responsible.profile.avatar_url}
          config={responsible.profile.avatar_config}
          size={30}
        />
      ) : null}
    </div>
  );
}

function Missions({ data }: { data: WorkspaceData }) {
  return data.missions.length ? (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {data.missions.map((mission) => {
        const completed = data.missionCompletionIds.includes(mission.id);
        const member = data.members.find(
          (item) => item.user_id === mission.assigned_to,
        );
        const target = mission.target_count ?? 1;
        return (
          <Surface key={mission.id}>
            <div className="flex items-start justify-between gap-3">
              <Badge
                tone={
                  completed
                    ? "green"
                    : mission.mission_type === "daily"
                      ? "blue"
                      : "neutral"
                }
              >
                {completed
                  ? "Concluída"
                  : missionTypeLabel(mission.mission_type)}
              </Badge>
              {member ? (
                <span className="flex min-w-0 items-center gap-2 text-xs text-slate-500">
                  <Avatar
                    name={member.profile.display_name}
                    src={member.profile.avatar_url}
                    config={member.profile.avatar_config}
                    size={28}
                  />
                  <span className="truncate">
                    {member.profile.display_name}
                  </span>
                </span>
              ) : null}
            </div>
            <Target
              className="mt-5 text-emerald-700 dark:text-emerald-400"
              size={22}
            />
            <h2 className="mt-3 text-lg font-semibold">{mission.name}</h2>
            <p className="mt-2 min-h-10 text-sm text-slate-500 dark:text-neutral-400">
              {mission.description}
            </p>
            <div className="mt-5 flex items-center justify-between text-xs">
              <span className="font-semibold">
                {Math.min(mission.progress_count, target)} de {target}
              </span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                +{mission.xp} XP
              </span>
            </div>
            <Progress
              value={formatPercent(mission.progress_count, target)}
              className="mt-2"
            />
            <div className="mt-4 flex items-center gap-1 text-xs text-slate-500">
              <CalendarDays size={13} />
              Até{" "}
              {mission.due_at
                ? dateLabel(mission.due_at, true)
                : "o fim do ciclo"}
            </div>
          </Surface>
        );
      })}
    </div>
  ) : (
    <Surface>
      <Empty
        icon={Sparkles}
        title="Analisando sua rotina"
        text="As missões aparecerão conforme você usar o DuoNest."
      />
    </Surface>
  );
}

function MissionRow({
  mission,
  completed,
  data,
}: {
  mission: Mission;
  completed: boolean;
  data: WorkspaceData;
}) {
  const member = data.members.find(
    (item) => item.user_id === mission.assigned_to,
  );
  const target = mission.target_count ?? 1;
  return (
    <div className="mt-3 rounded-lg border border-slate-200 p-3 dark:border-neutral-700">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg",
            completed
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950"
              : "bg-amber-100 text-amber-700 dark:bg-amber-950",
          )}
        >
          <Sparkles size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block truncate text-sm">{mission.name}</strong>
          <small className="text-slate-500 dark:text-neutral-400">
            {Math.min(mission.progress_count, target)}/{target} · +{mission.xp}{" "}
            XP
          </small>
        </span>
        {member ? (
          <Avatar
            name={member.profile.display_name}
            src={member.profile.avatar_url}
            config={member.profile.avatar_config}
            size={28}
          />
        ) : null}
      </div>
      <Progress
        value={formatPercent(mission.progress_count, target)}
        className="mt-3"
      />
    </div>
  );
}

function Calendar({ data }: { data: WorkspaceData }) {
  const events = [
    ...data.tasks
      .filter((task) => task.due_at)
      .map((task) => ({
        id: task.id,
        date: task.due_at!,
        title: task.title,
        kind: "Tarefa",
      })),
    ...data.missions
      .filter((mission) => mission.due_at)
      .map((mission) => ({
        id: mission.id,
        date: mission.due_at!,
        title: mission.name,
        kind: "Missão",
      })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <Surface>
      {events.length ? (
        <div className="space-y-2">
          {events.map((event) => (
            <div
              key={`${event.kind}-${event.id}`}
              className="grid grid-cols-[76px_1fr] items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-neutral-700"
            >
              <div className="text-center">
                <strong className="block text-lg">
                  {new Date(event.date).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                  })}
                </strong>
                <small className="uppercase text-slate-500">
                  {new Date(event.date).toLocaleDateString("pt-BR", {
                    month: "short",
                  })}
                </small>
              </div>
              <div>
                <Badge tone={event.kind === "Missão" ? "blue" : "green"}>
                  {event.kind}
                </Badge>
                <p className="mt-1 font-medium">{event.title}</p>
                <p className="text-xs text-slate-500">
                  {dateLabel(event.date, true)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          icon={CalendarDays}
          title="Agenda livre"
          text="Tarefas e missões com prazo aparecerão aqui."
        />
      )}
    </Surface>
  );
}

function Attention({
  data,
  run,
  edit,
  remove,
}: {
  data: WorkspaceData;
  run: (a: Promise<ActionResult>) => void;
  edit: (i: AttentionPoint) => void;
  remove: (i: AttentionPoint) => void;
}) {
  return data.attentionPoints.length ? (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {data.attentionPoints.map((point) => (
        <Surface key={point.id}>
          <div className="flex items-start justify-between">
            <AlertCircle
              className={
                point.status === "resolved"
                  ? "text-emerald-600"
                  : "text-amber-600"
              }
              size={22}
            />
            <Badge
              tone={
                point.status === "resolved"
                  ? "green"
                  : point.priority === "urgent"
                    ? "red"
                    : "amber"
              }
            >
              {point.status === "resolved"
                ? "Resolvido"
                : priorityLabel(point.priority)}
            </Badge>
          </div>
          <h2 className="mt-4 font-semibold">{point.title}</h2>
          <p className="mt-2 min-h-10 text-sm text-slate-500 dark:text-neutral-400">
            {point.description || point.category}
          </p>
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() =>
                run(
                  resolveAttentionPoint(point.id, point.status !== "resolved"),
                )
              }
              className="text-sm font-semibold text-emerald-700 dark:text-emerald-400"
            >
              {point.status === "resolved" ? "Reabrir" : "Resolver"}
            </button>
            <div className="flex">
              <IconButton label="Editar ponto" onClick={() => edit(point)}>
                <Edit3 size={16} />
              </IconButton>
              <IconButton
                label="Excluir ponto"
                danger
                onClick={() => remove(point)}
              >
                <Trash2 size={16} />
              </IconButton>
            </div>
          </div>
        </Surface>
      ))}
    </div>
  ) : (
    <Surface>
      <Empty
        icon={AlertCircle}
        title="Nenhum ponto de atenção"
        text="Registre manutenções, contas ou algo que precise ser acompanhado."
      />
    </Surface>
  );
}

function Records({
  data,
  edit,
  remove,
}: {
  data: WorkspaceData;
  edit: (r: HomeRecord) => void;
  remove: (r: HomeRecord) => void;
}) {
  return data.records.length ? (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {data.records.map((record) => (
        <Surface key={record.id}>
          <div className="flex items-start justify-between">
            <span className="grid size-9 place-items-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950">
              <Home size={18} />
            </span>
            <div className="flex">
              <IconButton label="Editar registro" onClick={() => edit(record)}>
                <Edit3 size={16} />
              </IconButton>
              <IconButton
                label="Excluir registro"
                danger
                onClick={() => remove(record)}
              >
                <Trash2 size={16} />
              </IconButton>
            </div>
          </div>
          <h2 className="mt-4 font-semibold">{record.title}</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">
            {record.description || record.category}
          </p>
          <p className="mt-4 text-xs font-medium text-slate-500">
            {new Date(`${record.record_date}T12:00:00`).toLocaleDateString(
              "pt-BR",
            )}
          </p>
        </Surface>
      ))}
    </div>
  ) : (
    <Surface>
      <Empty
        icon={Home}
        title="Nenhum registro"
        text="Guarde manutenções, comprovantes e acontecimentos da casa."
      />
    </Surface>
  );
}

function Achievements({ data }: { data: WorkspaceData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.achievements.map((achievement) => {
        const unlocked = data.unlockedAchievementIds.includes(achievement.id);
        return (
          <Surface
            key={achievement.id}
            className={
              unlocked ? "border-amber-300 dark:border-amber-700" : "opacity-70"
            }
          >
            <Trophy
              className={unlocked ? "text-amber-600" : "text-slate-400"}
              size={26}
            />
            <h2 className="mt-4 font-semibold">{achievement.name}</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">
              {achievement.description}
            </p>
            <p className="mt-4 text-xs font-semibold uppercase text-slate-500">
              {unlocked ? "Desbloqueada" : "Em progresso"}
            </p>
          </Surface>
        );
      })}
    </div>
  );
}

function Profile({
  data,
  run,
}: {
  data: WorkspaceData;
  run: (a: Promise<ActionResult>) => void;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <Surface>
        <AvatarUpload
          userId={data.userId}
          name={data.profile.display_name}
          avatarUrl={data.profile.avatar_url}
          avatarConfig={data.profile.avatar_config}
        />
        <h2 className="mt-4 text-xl font-semibold">
          {data.profile.display_name}
        </h2>
        <p className="text-sm text-slate-500">
          Nível {data.profile.level} · {data.profile.xp.toLocaleString("pt-BR")}{" "}
          XP
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Metric label="Tarefas" value={data.profile.tasks_completed} />
          <Metric label="Missões" value={data.profile.missions_completed} />
        </div>
      </Surface>
      <Surface>
        <h2 className="font-semibold">Editar perfil</h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={(event) =>
            submitForm(event, (formData) => run(updateProfile(formData)))
          }
        >
          <Field
            name="displayName"
            label="Nome"
            defaultValue={data.profile.display_name}
            required
          />
          <Field
            name="email"
            label="E-mail"
            defaultValue={data.profile.email ?? ""}
            disabled
          />
          <button className="h-10 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white">
            Salvar perfil
          </button>
        </form>
      </Surface>
    </div>
  );
}

function SettingsIndex() {
  const items = [
    {
      href: "/configuracoes/casa",
      title: "Casa",
      text: "Nome e preferências",
      icon: Home,
    },
    {
      href: "/configuracoes/membros",
      title: "Membros",
      text: "Convites e acessos",
      icon: Users,
    },
    {
      href: "/configuracoes/notificacoes",
      title: "Notificações",
      text: "Central de atualizações",
      icon: Bell,
    },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <Link href={item.href} key={item.href}>
          <Surface className="h-full transition hover:border-emerald-400">
            <item.icon
              className="text-emerald-700 dark:text-emerald-400"
              size={22}
            />
            <h2 className="mt-4 font-semibold">{item.title}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
              {item.text}
            </p>
          </Surface>
        </Link>
      ))}
    </div>
  );
}

function HomeSettings({
  data,
  run,
}: {
  data: WorkspaceData;
  run: (a: Promise<ActionResult>) => void;
}) {
  return (
    <Surface>
      <h2 className="font-semibold">Dados da casa</h2>
      <form
        className="mt-4 max-w-xl space-y-4"
        onSubmit={(event) =>
          submitForm(event, (formData) => run(updateHome(formData)))
        }
      >
        <Field
          name="name"
          label="Nome da casa"
          defaultValue={data.home.name}
          required
          disabled={data.role !== "owner"}
        />
        <button
          disabled={data.role !== "owner"}
          className="h-10 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          Salvar alterações
        </button>
        {data.role !== "owner" ? (
          <p className="text-sm text-slate-500">
            Somente o proprietário pode alterar estes dados.
          </p>
        ) : null}
      </form>
    </Surface>
  );
}

function Members({
  data,
  run,
  remove,
}: {
  data: WorkspaceData;
  run: (a: Promise<ActionResult>) => void;
  remove: (id: string, name: string) => void;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
      <Surface>
        <h2 className="font-semibold">Pessoas da casa</h2>
        <div className="mt-4 divide-y divide-slate-100 dark:divide-neutral-800">
          {data.members.map((member) => (
            <div key={member.id} className="flex items-center gap-3 py-3">
              <Avatar
                name={member.profile.display_name}
                src={member.profile.avatar_url}
                config={member.profile.avatar_config}
                size={40}
              />
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm">
                  {member.profile.display_name}
                </strong>
                <small className="block truncate text-slate-500">
                  {member.profile.email}
                </small>
              </span>
              <Badge tone={member.role === "owner" ? "green" : "neutral"}>
                {member.role === "owner" ? "Proprietário" : "Membro"}
              </Badge>
              {data.role === "owner" && member.user_id !== data.userId ? (
                <IconButton
                  label="Remover membro"
                  danger
                  onClick={() => remove(member.id, member.profile.display_name)}
                >
                  <Trash2 size={17} />
                </IconButton>
              ) : null}
            </div>
          ))}
        </div>
      </Surface>
      <Surface>
        <h2 className="font-semibold">Convidar pessoa</h2>
        {data.role === "owner" ? (
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) =>
              submitForm(event, (formData) => run(createInvite(formData)))
            }
          >
            <Field name="email" label="E-mail" type="email" required />
            <button className="h-10 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white">
              Gerar convite
            </button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            Somente o proprietário pode criar convites.
          </p>
        )}
        <div className="mt-5 space-y-2">
          {data.invites
            .filter((invite) => invite.status === "pending")
            .map((invite) => (
              <div
                key={invite.id}
                className="rounded-lg border border-slate-200 p-3 dark:border-neutral-700"
              >
                <p className="text-sm font-medium">{invite.email}</p>
                <code className="mt-1 block text-lg font-semibold text-emerald-700 dark:text-emerald-400">
                  {invite.code}
                </code>
                <small className="text-slate-500">
                  Expira em {dateLabel(invite.expires_at)}
                </small>
              </div>
            ))}
        </div>
      </Surface>
    </div>
  );
}

function Notifications({
  data,
  run,
}: {
  data: WorkspaceData;
  run: (a: Promise<ActionResult>) => void;
}) {
  return (
    <Surface>
      <BrowserNotificationControl />
      {data.notifications.length ? (
        <div className="divide-y divide-slate-100 dark:divide-neutral-800">
          {data.notifications.map((notification) => (
            <button
              key={notification.id}
              disabled={Boolean(notification.read_at)}
              onClick={() => run(markNotification(notification.id))}
              className={cn(
                "w-full py-4 text-left",
                notification.read_at && "opacity-60",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-1 size-2 rounded-full",
                    notification.read_at ? "bg-slate-300" : "bg-emerald-600",
                  )}
                />
                <span>
                  <strong className="text-sm">{notification.title}</strong>
                  <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
                    {notification.body}
                  </p>
                  <small className="mt-1 block text-slate-400">
                    {dateLabel(notification.created_at, true)}
                  </small>
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <Empty
          icon={Bell}
          title="Sem notificações"
          text="Atualizações importantes aparecerão aqui."
        />
      )}
    </Surface>
  );
}

function ActivityList({ data }: { data: WorkspaceData }) {
  return (
    <div className="mt-4 space-y-4">
      {data.activities.map((activity) => {
        const actor =
          data.members.find((member) => member.user_id === activity.actor_id)
            ?.profile.display_name ?? "Alguém";
        return (
          <div key={activity.id} className="flex gap-3">
            <span className="mt-2 size-2 rounded-full bg-emerald-600" />
            <div>
              <p className="text-sm">
                <strong>{actor}</strong> {activity.action}
              </p>
              <p className="text-xs text-slate-500">
                {dateLabel(activity.created_at, true)}
              </p>
            </div>
          </div>
        );
      })}
      {!data.activities.length ? (
        <p className="text-sm text-slate-500">
          As atividades reais da casa aparecerão aqui.
        </p>
      ) : null}
    </div>
  );
}

function EditorModal({
  editor,
  data,
  close,
  submit,
}: {
  editor: NonNullable<Editor>;
  data: WorkspaceData;
  close: () => void;
  submit: (formData: FormData) => void;
}) {
  const entity =
    editor.kind === "task"
      ? "tarefa"
      : editor.kind === "shopping"
        ? "item"
        : editor.kind === "attention"
          ? "ponto de atenção"
          : editor.kind === "record"
            ? "registro"
            : editor.kind === "expense"
              ? "gasto"
              : editor.kind === "plan"
                ? "planejamento"
                : "atividade";
  const title = `${editor.item ? "Editar" : "Adicionar"} ${entity}`;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-black/50 p-0 sm:place-items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        className="absolute inset-0"
        onClick={close}
        aria-label="Fechar"
      />
      <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-lg bg-white p-5 shadow-xl sm:max-w-xl sm:rounded-lg dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <IconButton label="Fechar" onClick={close}>
            <X size={19} />
          </IconButton>
        </div>
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => submitForm(event, submit)}
        >
          {editor.item ? (
            <input type="hidden" name="id" value={editor.item.id} />
          ) : null}
          {editor.kind === "task" ? (
            <TaskFields
              item={editor.item as Task | undefined}
              members={data.members}
            />
          ) : null}
          {editor.kind === "shopping" ? (
            <ShoppingFields
              item={editor.item as ShoppingItem | undefined}
              listId={data.shoppingLists[0]?.id}
            />
          ) : null}
          {editor.kind === "attention" ? (
            <AttentionFields
              item={editor.item as AttentionPoint | undefined}
              members={data.members}
            />
          ) : null}
          {editor.kind === "record" ? (
            <RecordFields item={editor.item as HomeRecord | undefined} />
          ) : null}
          {editor.kind === "expense" ? (
            <ExpenseFields
              item={editor.item as HouseholdExpense | undefined}
              members={data.members}
            />
          ) : null}
          {editor.kind === "plan" ? (
            <PlanFields
              item={editor.item as HouseholdPlan | undefined}
              members={data.members}
            />
          ) : null}
          {editor.kind === "schedule" ? (
            <ScheduleFields
              item={editor.item as ScheduleItem | undefined}
              members={data.members}
            />
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={close}
              className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold dark:border-neutral-700"
            >
              Cancelar
            </button>
            <button className="h-10 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white">
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskFields({
  item,
  members,
}: {
  item?: Task;
  members: WorkspaceData["members"];
}) {
  return (
    <>
      <Field name="title" label="Título" defaultValue={item?.title} required />
      <TextArea
        name="description"
        label="Descrição"
        defaultValue={item?.description}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="category"
          label="Categoria"
          defaultValue={item?.category ?? "Outros"}
        />
        <Select
          name="priority"
          label="Prioridade"
          defaultValue={item?.priority ?? "normal"}
          options={[
            ["low", "Baixa"],
            ["normal", "Normal"],
            ["high", "Alta"],
            ["urgent", "Urgente"],
          ]}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          name="assignment"
          label="Responsabilidade"
          defaultValue={item?.assignment ?? "both"}
          options={[
            ["self", "Eu"],
            ["partner", "Parceiro(a)"],
            ["both", "Ambos"],
            ["home", "Casa"],
          ]}
        />
        <Select
          name="assignedTo"
          label="Pessoa"
          defaultValue={item?.assigned_to ?? ""}
          options={[
            ["", "Sem pessoa específica"],
            ...members.map((member) => [
              member.user_id,
              member.profile.display_name,
            ]),
          ]}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          name="dueAt"
          label="Prazo"
          type="datetime-local"
          defaultValue={localDate(item?.due_at)}
        />
        <Select
          name="recurrence"
          label="Renovação"
          defaultValue={item?.recurrence ?? "none"}
          options={[
            ["none", "Não renovar"],
            ["daily", "Todos os dias"],
            ["business_days", "Somente dias úteis"],
            ["weekends", "Somente finais de semana"],
            ["weekly", "Toda semana"],
            ["biweekly", "A cada 15 dias"],
            ["monthly", "Todo mês"],
          ]}
        />
        <Field
          name="xp"
          label="XP ganho/perdido"
          type="number"
          defaultValue={String(item?.xp ?? 10)}
        />
      </div>
    </>
  );
}
function ShoppingFields({
  item,
  listId,
}: {
  item?: ShoppingItem;
  listId?: string;
}) {
  return (
    <>
      <input type="hidden" name="listId" value={listId ?? ""} />
      <Field
        name="product"
        label="Produto"
        defaultValue={item?.product}
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="quantity"
          label="Quantidade"
          defaultValue={item?.quantity ?? ""}
          placeholder="2 unidades"
        />
        <Field
          name="category"
          label="Categoria"
          defaultValue={item?.category ?? ""}
          placeholder="Alimentos"
        />
      </div>
      <TextArea name="notes" label="Observações" defaultValue={item?.notes} />
    </>
  );
}
function AttentionFields({
  item,
  members,
}: {
  item?: AttentionPoint;
  members: WorkspaceData["members"];
}) {
  return (
    <>
      <Field name="title" label="Título" defaultValue={item?.title} required />
      <TextArea
        name="description"
        label="Descrição"
        defaultValue={item?.description}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="category"
          label="Categoria"
          defaultValue={item?.category ?? "Outros"}
        />
        <Select
          name="priority"
          label="Prioridade"
          defaultValue={item?.priority ?? "normal"}
          options={[
            ["low", "Baixa"],
            ["normal", "Normal"],
            ["high", "Alta"],
            ["urgent", "Urgente"],
          ]}
        />
      </div>
      <Select
        name="assignedTo"
        label="Responsável"
        defaultValue={item?.assigned_to ?? ""}
        options={[
          ["", "Todos"],
          ...members.map((member) => [
            member.user_id,
            member.profile.display_name,
          ]),
        ]}
      />
    </>
  );
}
function RecordFields({ item }: { item?: HomeRecord }) {
  return (
    <>
      <Field name="title" label="Título" defaultValue={item?.title} required />
      <TextArea
        name="description"
        label="Descrição"
        defaultValue={item?.description}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="category"
          label="Categoria"
          defaultValue={item?.category ?? "Registro"}
        />
        <Field
          name="recordDate"
          label="Data"
          type="date"
          defaultValue={
            item?.record_date ?? new Date().toISOString().slice(0, 10)
          }
        />
      </div>
    </>
  );
}
function ExpenseFields({
  item,
  members,
}: {
  item?: HouseholdExpense;
  members: WorkspaceData["members"];
}) {
  return (
    <>
      <Field
        name="description"
        label="Descrição"
        defaultValue={item?.description}
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="amount"
          label="Valor (R$)"
          type="number"
          step="0.01"
          defaultValue={item ? String(item.amount) : ""}
          required
        />
        <Field
          name="expenseDate"
          label="Data"
          type="date"
          defaultValue={
            item?.expense_date ?? new Date().toISOString().slice(0, 10)
          }
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="category"
          label="Categoria"
          defaultValue={item?.category ?? "Outros"}
        />
        <Select
          name="status"
          label="Situação"
          defaultValue={item?.status ?? "pending"}
          options={[
            ["pending", "Pendente"],
            ["paid", "Pago"],
          ]}
        />
      </div>
      <Select
        name="paidBy"
        label="Pago por"
        defaultValue={item?.paid_by ?? ""}
        options={[
          ["", "Não definido"],
          ...members.map((member) => [
            member.user_id,
            member.profile.display_name,
          ]),
        ]}
      />
      <TextArea name="notes" label="Observações" defaultValue={item?.notes} />
    </>
  );
}
function PlanFields({
  item,
  members,
}: {
  item?: HouseholdPlan;
  members: WorkspaceData["members"];
}) {
  return (
    <>
      <Field name="title" label="Título" defaultValue={item?.title} required />
      <TextArea
        name="description"
        label="Descrição"
        defaultValue={item?.description}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          name="planType"
          label="Tipo"
          defaultValue={item?.plan_type ?? "other"}
          options={[
            ["purchase", "Compra"],
            ["improvement", "Melhoria"],
            ["maintenance", "Manutenção"],
            ["other", "Outro"],
          ]}
        />
        <Select
          name="status"
          label="Andamento"
          defaultValue={item?.status ?? "planned"}
          options={[
            ["planned", "Planejado"],
            ["in_progress", "Em andamento"],
            ["completed", "Concluído"],
            ["cancelled", "Cancelado"],
          ]}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="targetDate"
          label="Data alvo"
          type="date"
          defaultValue={item?.target_date ?? ""}
        />
        <Field
          name="estimatedCost"
          label="Custo estimado (R$)"
          type="number"
          defaultValue={
            item?.estimated_cost !== null && item?.estimated_cost !== undefined
              ? String(item.estimated_cost)
              : ""
          }
        />
      </div>
      <Select
        name="responsibleId"
        label="Responsável"
        defaultValue={item?.responsible_id ?? ""}
        options={[
          ["", "Toda a casa"],
          ...members.map((member) => [
            member.user_id,
            member.profile.display_name,
          ]),
        ]}
      />
    </>
  );
}
function ScheduleFields({
  item,
  members,
}: {
  item?: ScheduleItem;
  members: WorkspaceData["members"];
}) {
  return (
    <>
      <Field
        name="title"
        label="Atividade"
        defaultValue={item?.title}
        required
      />
      <TextArea
        name="description"
        label="Detalhes"
        defaultValue={item?.description}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          name="dayScope"
          label="Quando acontece"
          defaultValue={item?.day_scope ?? "anyday"}
          options={[
            ["anyday", "Todos os dias"],
            ["business_days", "Dias úteis"],
            ["weekends", "Finais de semana"],
            ["specific", "Data específica"],
          ]}
        />
        <Field
          name="scheduledDate"
          label="Data específica"
          type="date"
          defaultValue={item?.scheduled_date ?? ""}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="startTime"
          label="Horário"
          type="time"
          defaultValue={item?.start_time?.slice(0, 5) ?? "09:00"}
          required
        />
        <Field
          name="durationMinutes"
          label="Duração (minutos)"
          type="number"
          defaultValue={String(item?.duration_minutes ?? 60)}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          name="room"
          label="Local"
          defaultValue={item?.room ?? "Sala"}
          options={homeRooms.map(({ room }) => [room, roomLabel(room)])}
        />
        <Select
          name="responsibleId"
          label="Responsável"
          defaultValue={item?.responsible_id ?? ""}
          options={[
            ["", "O casal"],
            ...members.map((member) => [
              member.user_id,
              member.profile.display_name,
            ]),
          ]}
        />
      </div>
    </>
  );
}

function Field({
  name,
  label,
  type = "text",
  defaultValue,
  placeholder,
  required,
  disabled,
  step,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  step?: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-950"
      />
    </label>
  );
}
function TextArea({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        rows={3}
        className="mt-1 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-600 dark:border-neutral-700 dark:bg-neutral-950"
      />
    </label>
  );
}
function Select({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: string[][];
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-emerald-600 dark:border-neutral-700 dark:bg-neutral-950"
      >
        {options.map(([value, label]) => (
          <option value={value} key={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
function IconButton({
  label,
  children,
  onClick,
  danger,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-neutral-400 dark:hover:bg-neutral-800",
        danger &&
          "hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400",
      )}
    >
      {children}
    </button>
  );
}
function SectionTitle({
  icon: Icon,
  title,
  href,
}: {
  icon: typeof Home;
  title: string;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon size={18} className="text-emerald-700 dark:text-emerald-400" />
        <h2 className="font-semibold">{title}</h2>
      </div>
      {href ? (
        <Link
          className="text-sm font-semibold text-emerald-700 dark:text-emerald-400"
          href={href}
        >
          Ver tudo
        </Link>
      ) : null}
    </div>
  );
}
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/10 p-3">
      <p className="text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-neutral-400">{label}</p>
    </div>
  );
}
function submitForm(
  event: FormEvent<HTMLFormElement>,
  submit: (data: FormData) => void,
) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  formData.set("timezoneOffset", String(new Date().getTimezoneOffset()));
  submit(formData);
}
function priorityLabel(value: Task["priority"]) {
  return { low: "Baixa", normal: "Normal", high: "Alta", urgent: "Urgente" }[
    value
  ];
}
function assignmentLabel(value: Task["assignment"]) {
  return { self: "Eu", partner: "Parceiro(a)", both: "Ambos", home: "Casa" }[
    value
  ];
}
function recurrenceLabel(value: Task["recurrence"]) {
  return {
    none: "Sem renovação",
    daily: "Todos os dias",
    business_days: "Dias úteis",
    weekends: "Finais de semana",
    weekly: "Toda semana",
    biweekly: "A cada 15 dias",
    monthly: "Todo mês",
    custom: "Personalizada",
  }[value];
}
function missionTypeLabel(value: Mission["mission_type"]) {
  return {
    daily: "Diária",
    weekly: "Semanal",
    special: "Especial",
    custom: "Personalizada",
  }[value];
}
function planTypeLabel(value: HouseholdPlan["plan_type"]) {
  return {
    purchase: "Compra",
    improvement: "Melhoria",
    maintenance: "Manutenção",
    other: "Outro",
  }[value];
}
function planStatusLabel(value: HouseholdPlan["status"]) {
  return {
    planned: "Planejado",
    in_progress: "Em andamento",
    completed: "Concluído",
    cancelled: "Cancelado",
  }[value];
}
function isTaskOverdue(task: Task) {
  return (
    task.status !== "resolved" &&
    Boolean(task.due_at && new Date(task.due_at).getTime() < Date.now())
  );
}
function money(value: number) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
function dateLabel(value: string, withTime = false) {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);
  return parsed.toLocaleString(
    "pt-BR",
    withTime
      ? { dateStyle: "short", timeStyle: "short" }
      : { dateStyle: "short" },
  );
}
function localDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
function localDayKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bahia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}
function roomLabel(room: HomeRoom) {
  return {
    Sala: "Sala",
    Cozinha: "Cozinha",
    Quarto: "Quarto",
    Banheiro: "Banheiro",
    Escritorio: "Escritório",
    "Area externa": "Área externa",
  }[room];
}
function durationLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h${rest ? ` ${rest}min` : ""}` : `${rest}min`;
}
