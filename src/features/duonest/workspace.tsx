"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Bell, CalendarDays, Check, CheckCircle2, Clock, Edit3, Home, ListChecks, LoaderCircle, Plus, ShoppingCart, Sparkles, Trash2, Trophy, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BrandLogo } from "@/components/brand/brand-logo";
import { cn, formatPercent } from "@/lib/utils";
import type { AttentionPoint, HomeRecord, Mission, ShoppingItem, Task, WorkspaceData } from "@/lib/duonest/types";
import type { DuoNestView } from "./duonest-app";
import {
  completeMission, createAttentionPoint, createInvite, createMission, createRecord, createShoppingItem, createTask,
  deleteAttentionPoint, deleteMission, deleteRecord, deleteShoppingItem, deleteTask, markNotification, removeMember,
  resolveAttentionPoint, toggleShoppingItem, toggleTask, updateAttentionPoint, updateHome, updateMission, updateProfile,
  updateRecord, updateShoppingItem, updateTask, type ActionResult,
} from "./actions";

type Editor = { kind: "task"; item?: Task } | { kind: "shopping"; item?: ShoppingItem } | { kind: "mission"; item?: Mission } | { kind: "attention"; item?: AttentionPoint } | { kind: "record"; item?: HomeRecord } | null;

const titleByView: Record<DuoNestView, string> = {
  dashboard: "Visão geral", tarefas: "Tarefas", calendario: "Calendário", missoes: "Missões", mercado: "Mercado",
  pontos: "Pontos de atenção", registros: "Registros da casa", conquistas: "Conquistas", perfil: "Perfil",
  configuracoes: "Configurações", casa: "Configurações da casa", membros: "Membros da casa", notificacoes: "Notificações",
};

const modalKindByView: Partial<Record<DuoNestView, NonNullable<Editor>["kind"]>> = { tarefas: "task", mercado: "shopping", missoes: "mission", pontos: "attention", registros: "record" };

export function Workspace({ view, data, initialOpen }: { view: DuoNestView; data: WorkspaceData; initialOpen: boolean }) {
  const router = useRouter();
  const initialKind = initialOpen ? modalKindByView[view] : undefined;
  const [editor, setEditor] = useState<Editor>(initialKind ? { kind: initialKind } as Editor : null);
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
    if (window.confirm(`Remover ${label}? Esta ação não pode ser desfeita.`)) run(action);
  }

  const addKind = modalKindByView[view];
  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-3">
        <div><p className="text-sm text-slate-500 dark:text-neutral-400">{data.home.name}</p><h1 className="text-2xl font-semibold sm:text-3xl">{titleByView[view]}</h1></div>
        {addKind ? <button onClick={() => setEditor({ kind: addKind } as Editor)} className="flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800"><Plus size={17} /><span className="hidden sm:inline">Adicionar</span></button> : null}
      </header>
      {feedback ? <div role={feedback.ok ? "status" : "alert"} className={cn("flex items-center justify-between rounded-lg px-4 py-3 text-sm", feedback.ok ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300")}><span>{feedback.message}</span><button onClick={() => setFeedback(null)} aria-label="Fechar mensagem"><X size={17} /></button></div> : null}
      {pending ? <div className="fixed bottom-24 right-4 z-50 flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm text-white shadow-lg dark:bg-white dark:text-black"><LoaderCircle className="animate-spin" size={16} />Salvando</div> : null}

      {view === "dashboard" ? <Dashboard data={data} run={run} /> : null}
      {view === "tarefas" ? <Tasks data={data} run={run} edit={(item) => setEditor({ kind: "task", item })} remove={(item) => confirmDelete(`a tarefa “${item.title}”`, deleteTask(item.id))} /> : null}
      {view === "mercado" ? <Shopping data={data} run={run} edit={(item) => setEditor({ kind: "shopping", item })} remove={(item) => confirmDelete(`“${item.product}”`, deleteShoppingItem(item.id))} /> : null}
      {view === "missoes" ? <Missions data={data} run={run} edit={(item) => setEditor({ kind: "mission", item })} remove={(item) => confirmDelete(`a missão “${item.name}”`, deleteMission(item.id))} /> : null}
      {view === "calendario" ? <Calendar data={data} /> : null}
      {view === "pontos" ? <Attention data={data} run={run} edit={(item) => setEditor({ kind: "attention", item })} remove={(item) => confirmDelete(`“${item.title}”`, deleteAttentionPoint(item.id))} /> : null}
      {view === "registros" ? <Records data={data} edit={(item) => setEditor({ kind: "record", item })} remove={(item) => confirmDelete(`“${item.title}”`, deleteRecord(item.id))} /> : null}
      {view === "conquistas" ? <Achievements data={data} /> : null}
      {view === "perfil" ? <Profile data={data} run={run} /> : null}
      {view === "configuracoes" ? <SettingsIndex /> : null}
      {view === "casa" ? <HomeSettings data={data} run={run} /> : null}
      {view === "membros" ? <Members data={data} run={run} remove={(id, name) => confirmDelete(`o acesso de ${name}`, removeMember(id))} /> : null}
      {view === "notificacoes" ? <Notifications data={data} run={run} /> : null}

      {editor ? <EditorModal editor={editor} data={data} close={() => setEditor(null)} submit={(formData) => {
        const action = editor.kind === "task" ? (editor.item ? updateTask(formData) : createTask(formData))
          : editor.kind === "shopping" ? (editor.item ? updateShoppingItem(formData) : createShoppingItem(formData))
            : editor.kind === "mission" ? (editor.item ? updateMission(formData) : createMission(formData))
              : editor.kind === "attention" ? (editor.item ? updateAttentionPoint(formData) : createAttentionPoint(formData))
                : (editor.item ? updateRecord(formData) : createRecord(formData));
        run(action, true);
      }} /> : null}
    </div>
  );
}

function Surface({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900", className)}>{children}</section>;
}

function Empty({ icon: Icon, title, text }: { icon: typeof Home; title: string; text: string }) {
  return <div className="grid min-h-48 place-items-center text-center"><div><Icon className="mx-auto text-slate-300 dark:text-neutral-600" size={32} /><h2 className="mt-3 font-semibold">{title}</h2><p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-neutral-400">{text}</p></div></div>;
}

function Dashboard({ data, run }: { data: WorkspaceData; run: (action: Promise<ActionResult>) => void }) {
  const openTasks = data.tasks.filter((task) => task.status !== "resolved");
  const doneTasks = data.tasks.length - openTasks.length;
  const pendingItems = data.shoppingItems.filter((item) => !item.bought);
  const nextXp = Math.max(data.home.xp + 500, (data.home.level + 1) * 600);
  return <div className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
    <div className="space-y-5">
      <section className="overflow-hidden rounded-lg bg-neutral-950 p-5 text-white shadow-sm sm:p-6 dark:border dark:border-neutral-800">
        <div className="flex items-start justify-between gap-4"><div><p className="text-sm text-emerald-300">Nível da casa {data.home.level}</p><h2 className="mt-2 text-3xl font-semibold">{data.home.xp.toLocaleString("pt-BR")} XP</h2><p className="mt-1 text-sm text-neutral-400">A rotina cresce com a colaboração.</p></div><BrandLogo size={76} className="shadow-lg ring-1 ring-white/20" /></div><div className="mt-4 flex justify-end"><span className="text-sm text-neutral-400">Meta {nextXp.toLocaleString("pt-BR")}</span></div><Progress value={formatPercent(data.home.xp, nextXp)} className="mt-2 bg-white/15" />
        <div className="mt-5 grid grid-cols-3 gap-2"><Metric label="Concluídas" value={doneTasks} /><Metric label="Pendentes" value={openTasks.length} /><Metric label="Mercado" value={pendingItems.length} /></div>
      </section>
      <Surface><SectionTitle icon={ListChecks} title="Próximas tarefas" href="/tarefas" /><div className="mt-3 space-y-2">{openTasks.slice(0, 5).map((task) => <TaskRow key={task.id} task={task} data={data} toggle={() => run(toggleTask(task.id, true))} />)}{!openTasks.length ? <Empty icon={CheckCircle2} title="Tudo em dia" text="Novas tarefas aparecerão aqui." /> : null}</div></Surface>
      <Surface><SectionTitle icon={Clock} title="Atividade recente" /><ActivityList data={data} /></Surface>
    </div>
    <div className="space-y-5">
      <Surface><SectionTitle icon={Sparkles} title="Missões" href="/missoes" />{data.missions.slice(0, 3).map((mission) => <MissionRow key={mission.id} mission={mission} completed={data.missionCompletionIds.includes(mission.id)} run={run} />)}{!data.missions.length ? <Empty icon={Sparkles} title="Sem missões" text="Crie desafios para a casa." /> : null}</Surface>
      <Surface><SectionTitle icon={ShoppingCart} title="Lista de mercado" href="/mercado" />{pendingItems.slice(0, 6).map((item) => <ShoppingRow key={item.id} item={item} toggle={() => run(toggleShoppingItem(item.id, true))} />)}{!pendingItems.length ? <Empty icon={ShoppingCart} title="Lista vazia" text="Adicione os próximos itens da casa." /> : null}</Surface>
    </div>
  </div>;
}

function Tasks({ data, run, edit, remove }: { data: WorkspaceData; run: (a: Promise<ActionResult>) => void; edit: (t: Task) => void; remove: (t: Task) => void }) {
  return <Surface>{data.tasks.length ? <div className="divide-y divide-slate-100 dark:divide-neutral-800">{data.tasks.map((task) => <div key={task.id} className="flex items-center gap-3 py-3"><TaskRow task={task} data={data} toggle={() => run(toggleTask(task.id, task.status !== "resolved"))} className="flex-1" /><IconButton label="Editar tarefa" onClick={() => edit(task)}><Edit3 size={17} /></IconButton><IconButton label="Excluir tarefa" danger onClick={() => remove(task)}><Trash2 size={17} /></IconButton></div>)}</div> : <Empty icon={ListChecks} title="Nenhuma tarefa" text="Adicione a primeira tarefa da casa." />}</Surface>;
}

function TaskRow({ task, data, toggle, className }: { task: Task; data: WorkspaceData; toggle: () => void; className?: string }) {
  const member = data.members.find((item) => item.user_id === task.assigned_to);
  return <button onClick={toggle} className={cn("flex min-w-0 items-center gap-3 rounded-lg p-2 text-left hover:bg-slate-50 dark:hover:bg-neutral-800", className)}><span className={cn("grid size-8 shrink-0 place-items-center rounded-full border", task.status === "resolved" ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 dark:border-neutral-600")}><Check size={16} className={task.status === "resolved" ? "" : "opacity-0"} /></span><span className="min-w-0 flex-1"><span className={cn("block truncate font-medium", task.status === "resolved" && "text-slate-400 line-through")}>{task.title}</span><span className="mt-1 block truncate text-xs text-slate-500 dark:text-neutral-400">{task.category} · {member?.profile.display_name ?? assignmentLabel(task.assignment)}{task.due_at ? ` · ${dateLabel(task.due_at)}` : ""}</span></span><Badge tone={task.priority === "urgent" ? "red" : task.priority === "high" ? "amber" : "neutral"}>{priorityLabel(task.priority)}</Badge><span className="hidden text-sm font-semibold text-emerald-700 dark:text-emerald-400 sm:block">+{task.xp}</span></button>;
}

function Shopping({ data, run, edit, remove }: { data: WorkspaceData; run: (a: Promise<ActionResult>) => void; edit: (i: ShoppingItem) => void; remove: (i: ShoppingItem) => void }) {
  return <Surface>{data.shoppingItems.length ? <div className="divide-y divide-slate-100 dark:divide-neutral-800">{data.shoppingItems.map((item) => <div key={item.id} className="flex items-center gap-2 py-2"><ShoppingRow item={item} toggle={() => run(toggleShoppingItem(item.id, !item.bought))} className="flex-1" /><IconButton label="Editar item" onClick={() => edit(item)}><Edit3 size={17} /></IconButton><IconButton label="Excluir item" danger onClick={() => remove(item)}><Trash2 size={17} /></IconButton></div>)}</div> : <Empty icon={ShoppingCart} title="Lista vazia" text="Adicione o primeiro produto." />}</Surface>;
}

function ShoppingRow({ item, toggle, className }: { item: ShoppingItem; toggle: () => void; className?: string }) {
  return <button onClick={toggle} className={cn("flex min-h-11 min-w-0 items-center gap-3 rounded-lg px-2 text-left hover:bg-slate-50 dark:hover:bg-neutral-800", className)}><span className={cn("grid size-6 shrink-0 place-items-center rounded-md border", item.bought ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 dark:border-neutral-600")}>{item.bought ? <Check size={14} /> : null}</span><span className={cn("min-w-0 flex-1 truncate text-sm font-medium", item.bought && "text-slate-400 line-through")}>{item.product}</span><span className="shrink-0 text-xs text-slate-500 dark:text-neutral-400">{item.quantity}</span></button>;
}

function Missions({ data, run, edit, remove }: { data: WorkspaceData; run: (a: Promise<ActionResult>) => void; edit: (m: Mission) => void; remove: (m: Mission) => void }) {
  return data.missions.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.missions.map((mission) => { const completed = data.missionCompletionIds.includes(mission.id); return <Surface key={mission.id}><div className="flex items-start justify-between"><Badge tone={completed ? "green" : mission.mission_type === "special" ? "blue" : "neutral"}>{completed ? "Concluída" : missionTypeLabel(mission.mission_type)}</Badge><div className="flex"><IconButton label="Editar missão" onClick={() => edit(mission)}><Edit3 size={16} /></IconButton><IconButton label="Excluir missão" danger onClick={() => remove(mission)}><Trash2 size={16} /></IconButton></div></div><h2 className="mt-4 text-lg font-semibold">{mission.name}</h2><p className="mt-2 min-h-10 text-sm text-slate-500 dark:text-neutral-400">{mission.description || "Sem descrição."}</p><div className="mt-5 flex items-center justify-between"><span className="font-semibold text-emerald-700 dark:text-emerald-400">+{mission.xp} XP</span><button disabled={completed} onClick={() => run(completeMission(mission.id))} className="h-9 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white disabled:bg-slate-300 dark:disabled:bg-neutral-700">{completed ? "Concluída" : "Concluir"}</button></div></Surface>; })}</div> : <Surface><Empty icon={Sparkles} title="Nenhuma missão" text="Crie a primeira meta colaborativa." /></Surface>;
}

function MissionRow({ mission, completed, run }: { mission: Mission; completed: boolean; run: (a: Promise<ActionResult>) => void }) {
  return <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-neutral-700"><span className={cn("grid size-8 place-items-center rounded-lg", completed ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950" : "bg-amber-100 text-amber-700 dark:bg-amber-950")}><Sparkles size={17} /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{mission.name}</strong><small className="text-slate-500 dark:text-neutral-400">+{mission.xp} XP</small></span><button disabled={completed} onClick={() => run(completeMission(mission.id))} className="text-sm font-semibold text-emerald-700 disabled:text-slate-400 dark:text-emerald-400">{completed ? "Feita" : "Concluir"}</button></div>;
}

function Calendar({ data }: { data: WorkspaceData }) {
  const events = [...data.tasks.filter((task) => task.due_at).map((task) => ({ id: task.id, date: task.due_at!, title: task.title, kind: "Tarefa" })), ...data.missions.filter((mission) => mission.due_at).map((mission) => ({ id: mission.id, date: mission.due_at!, title: mission.name, kind: "Missão" }))].sort((a, b) => a.date.localeCompare(b.date));
  return <Surface>{events.length ? <div className="space-y-2">{events.map((event) => <div key={`${event.kind}-${event.id}`} className="grid grid-cols-[76px_1fr] items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-neutral-700"><div className="text-center"><strong className="block text-lg">{new Date(event.date).toLocaleDateString("pt-BR", { day: "2-digit" })}</strong><small className="uppercase text-slate-500">{new Date(event.date).toLocaleDateString("pt-BR", { month: "short" })}</small></div><div><Badge tone={event.kind === "Missão" ? "blue" : "green"}>{event.kind}</Badge><p className="mt-1 font-medium">{event.title}</p><p className="text-xs text-slate-500">{dateLabel(event.date, true)}</p></div></div>)}</div> : <Empty icon={CalendarDays} title="Agenda livre" text="Tarefas e missões com prazo aparecerão aqui." />}</Surface>;
}

function Attention({ data, run, edit, remove }: { data: WorkspaceData; run: (a: Promise<ActionResult>) => void; edit: (i: AttentionPoint) => void; remove: (i: AttentionPoint) => void }) {
  return data.attentionPoints.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.attentionPoints.map((point) => <Surface key={point.id}><div className="flex items-start justify-between"><AlertCircle className={point.status === "resolved" ? "text-emerald-600" : "text-amber-600"} size={22} /><Badge tone={point.status === "resolved" ? "green" : point.priority === "urgent" ? "red" : "amber"}>{point.status === "resolved" ? "Resolvido" : priorityLabel(point.priority)}</Badge></div><h2 className="mt-4 font-semibold">{point.title}</h2><p className="mt-2 min-h-10 text-sm text-slate-500 dark:text-neutral-400">{point.description || point.category}</p><div className="mt-4 flex items-center justify-between"><button onClick={() => run(resolveAttentionPoint(point.id, point.status !== "resolved"))} className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{point.status === "resolved" ? "Reabrir" : "Resolver"}</button><div className="flex"><IconButton label="Editar ponto" onClick={() => edit(point)}><Edit3 size={16} /></IconButton><IconButton label="Excluir ponto" danger onClick={() => remove(point)}><Trash2 size={16} /></IconButton></div></div></Surface>)}</div> : <Surface><Empty icon={AlertCircle} title="Nenhum ponto de atenção" text="Registre manutenções, contas ou algo que precise ser acompanhado." /></Surface>;
}

function Records({ data, edit, remove }: { data: WorkspaceData; edit: (r: HomeRecord) => void; remove: (r: HomeRecord) => void }) {
  return data.records.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.records.map((record) => <Surface key={record.id}><div className="flex items-start justify-between"><span className="grid size-9 place-items-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950"><Home size={18} /></span><div className="flex"><IconButton label="Editar registro" onClick={() => edit(record)}><Edit3 size={16} /></IconButton><IconButton label="Excluir registro" danger onClick={() => remove(record)}><Trash2 size={16} /></IconButton></div></div><h2 className="mt-4 font-semibold">{record.title}</h2><p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">{record.description || record.category}</p><p className="mt-4 text-xs font-medium text-slate-500">{new Date(`${record.record_date}T12:00:00`).toLocaleDateString("pt-BR")}</p></Surface>)}</div> : <Surface><Empty icon={Home} title="Nenhum registro" text="Guarde manutenções, comprovantes e acontecimentos da casa." /></Surface>;
}

function Achievements({ data }: { data: WorkspaceData }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.achievements.map((achievement) => { const unlocked = data.unlockedAchievementIds.includes(achievement.id); return <Surface key={achievement.id} className={unlocked ? "border-amber-300 dark:border-amber-700" : "opacity-70"}><Trophy className={unlocked ? "text-amber-600" : "text-slate-400"} size={26} /><h2 className="mt-4 font-semibold">{achievement.name}</h2><p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">{achievement.description}</p><p className="mt-4 text-xs font-semibold uppercase text-slate-500">{unlocked ? "Desbloqueada" : "Em progresso"}</p></Surface>; })}</div>;
}

function Profile({ data, run }: { data: WorkspaceData; run: (a: Promise<ActionResult>) => void }) {
  return <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]"><Surface><span className="grid size-20 place-items-center rounded-full bg-emerald-700 text-2xl font-semibold text-white">{data.profile.display_name.slice(0, 1).toUpperCase()}</span><h2 className="mt-4 text-xl font-semibold">{data.profile.display_name}</h2><p className="text-sm text-slate-500">Nível {data.profile.level} · {data.profile.xp.toLocaleString("pt-BR")} XP</p><div className="mt-5 grid grid-cols-2 gap-3"><Metric label="Tarefas" value={data.profile.tasks_completed} /><Metric label="Missões" value={data.profile.missions_completed} /></div></Surface><Surface><h2 className="font-semibold">Editar perfil</h2><form className="mt-4 space-y-4" onSubmit={(event) => submitForm(event, (formData) => run(updateProfile(formData)))}><Field name="displayName" label="Nome" defaultValue={data.profile.display_name} required /><Field name="email" label="E-mail" defaultValue={data.profile.email ?? ""} disabled /><button className="h-10 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white">Salvar perfil</button></form></Surface></div>;
}

function SettingsIndex() {
  const items = [{ href: "/configuracoes/casa", title: "Casa", text: "Nome e preferências", icon: Home }, { href: "/configuracoes/membros", title: "Membros", text: "Convites e acessos", icon: Users }, { href: "/configuracoes/notificacoes", title: "Notificações", text: "Central de atualizações", icon: Bell }];
  return <div className="grid gap-4 md:grid-cols-3">{items.map((item) => <Link href={item.href} key={item.href}><Surface className="h-full transition hover:border-emerald-400"><item.icon className="text-emerald-700 dark:text-emerald-400" size={22} /><h2 className="mt-4 font-semibold">{item.title}</h2><p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">{item.text}</p></Surface></Link>)}</div>;
}

function HomeSettings({ data, run }: { data: WorkspaceData; run: (a: Promise<ActionResult>) => void }) {
  return <Surface><h2 className="font-semibold">Dados da casa</h2><form className="mt-4 max-w-xl space-y-4" onSubmit={(event) => submitForm(event, (formData) => run(updateHome(formData)))}><Field name="name" label="Nome da casa" defaultValue={data.home.name} required disabled={data.role !== "owner"} /><button disabled={data.role !== "owner"} className="h-10 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50">Salvar alterações</button>{data.role !== "owner" ? <p className="text-sm text-slate-500">Somente o proprietário pode alterar estes dados.</p> : null}</form></Surface>;
}

function Members({ data, run, remove }: { data: WorkspaceData; run: (a: Promise<ActionResult>) => void; remove: (id: string, name: string) => void }) {
  return <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]"><Surface><h2 className="font-semibold">Pessoas da casa</h2><div className="mt-4 divide-y divide-slate-100 dark:divide-neutral-800">{data.members.map((member) => <div key={member.id} className="flex items-center gap-3 py-3"><span className="grid size-10 place-items-center rounded-full bg-emerald-100 font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{member.profile.display_name.slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{member.profile.display_name}</strong><small className="block truncate text-slate-500">{member.profile.email}</small></span><Badge tone={member.role === "owner" ? "green" : "neutral"}>{member.role === "owner" ? "Proprietário" : "Membro"}</Badge>{data.role === "owner" && member.user_id !== data.userId ? <IconButton label="Remover membro" danger onClick={() => remove(member.id, member.profile.display_name)}><Trash2 size={17} /></IconButton> : null}</div>)}</div></Surface><Surface><h2 className="font-semibold">Convidar pessoa</h2>{data.role === "owner" ? <form className="mt-4 space-y-3" onSubmit={(event) => submitForm(event, (formData) => run(createInvite(formData)))}><Field name="email" label="E-mail" type="email" required /><button className="h-10 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white">Gerar convite</button></form> : <p className="mt-3 text-sm text-slate-500">Somente o proprietário pode criar convites.</p>}<div className="mt-5 space-y-2">{data.invites.filter((invite) => invite.status === "pending").map((invite) => <div key={invite.id} className="rounded-lg border border-slate-200 p-3 dark:border-neutral-700"><p className="text-sm font-medium">{invite.email}</p><code className="mt-1 block text-lg font-semibold text-emerald-700 dark:text-emerald-400">{invite.code}</code><small className="text-slate-500">Expira em {dateLabel(invite.expires_at)}</small></div>)}</div></Surface></div>;
}

function Notifications({ data, run }: { data: WorkspaceData; run: (a: Promise<ActionResult>) => void }) {
  return <Surface>{data.notifications.length ? <div className="divide-y divide-slate-100 dark:divide-neutral-800">{data.notifications.map((notification) => <button key={notification.id} disabled={Boolean(notification.read_at)} onClick={() => run(markNotification(notification.id))} className={cn("w-full py-4 text-left", notification.read_at && "opacity-60")}><div className="flex items-start gap-3"><span className={cn("mt-1 size-2 rounded-full", notification.read_at ? "bg-slate-300" : "bg-emerald-600")} /><span><strong className="text-sm">{notification.title}</strong><p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">{notification.body}</p><small className="mt-1 block text-slate-400">{dateLabel(notification.created_at, true)}</small></span></div></button>)}</div> : <Empty icon={Bell} title="Sem notificações" text="Atualizações importantes aparecerão aqui." />}</Surface>;
}

function ActivityList({ data }: { data: WorkspaceData }) {
  return <div className="mt-4 space-y-4">{data.activities.map((activity) => { const actor = data.members.find((member) => member.user_id === activity.actor_id)?.profile.display_name ?? "Alguém"; return <div key={activity.id} className="flex gap-3"><span className="mt-2 size-2 rounded-full bg-emerald-600" /><div><p className="text-sm"><strong>{actor}</strong> {activity.action}</p><p className="text-xs text-slate-500">{dateLabel(activity.created_at, true)}</p></div></div>; })}{!data.activities.length ? <p className="text-sm text-slate-500">As atividades reais da casa aparecerão aqui.</p> : null}</div>;
}

function EditorModal({ editor, data, close, submit }: { editor: NonNullable<Editor>; data: WorkspaceData; close: () => void; submit: (formData: FormData) => void }) {
  const title = `${editor.item ? "Editar" : "Adicionar"} ${editor.kind === "task" ? "tarefa" : editor.kind === "shopping" ? "item" : editor.kind === "mission" ? "missão" : editor.kind === "attention" ? "ponto de atenção" : "registro"}`;
  return <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 p-0 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}><button className="absolute inset-0" onClick={close} aria-label="Fechar" /><div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-lg bg-white p-5 shadow-xl sm:max-w-xl sm:rounded-lg dark:bg-neutral-900"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{title}</h2><IconButton label="Fechar" onClick={close}><X size={19} /></IconButton></div><form className="mt-5 space-y-4" onSubmit={(event) => submitForm(event, submit)}>{editor.item ? <input type="hidden" name="id" value={editor.item.id} /> : null}{editor.kind === "task" ? <TaskFields item={editor.item as Task | undefined} members={data.members} /> : null}{editor.kind === "shopping" ? <ShoppingFields item={editor.item as ShoppingItem | undefined} listId={data.shoppingLists[0]?.id} /> : null}{editor.kind === "mission" ? <MissionFields item={editor.item as Mission | undefined} /> : null}{editor.kind === "attention" ? <AttentionFields item={editor.item as AttentionPoint | undefined} members={data.members} /> : null}{editor.kind === "record" ? <RecordFields item={editor.item as HomeRecord | undefined} /> : null}<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={close} className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold dark:border-neutral-700">Cancelar</button><button className="h-10 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white">Salvar</button></div></form></div></div>;
}

function TaskFields({ item, members }: { item?: Task; members: WorkspaceData["members"] }) { return <><Field name="title" label="Título" defaultValue={item?.title} required /><TextArea name="description" label="Descrição" defaultValue={item?.description} /><div className="grid gap-4 sm:grid-cols-2"><Field name="category" label="Categoria" defaultValue={item?.category ?? "Outros"} /><Select name="priority" label="Prioridade" defaultValue={item?.priority ?? "normal"} options={[["low","Baixa"],["normal","Normal"],["high","Alta"],["urgent","Urgente"]]} /></div><div className="grid gap-4 sm:grid-cols-2"><Select name="assignment" label="Responsabilidade" defaultValue={item?.assignment ?? "both"} options={[["self","Eu"],["partner","Parceiro(a)"],["both","Ambos"],["home","Casa"]]} /><Select name="assignedTo" label="Pessoa" defaultValue={item?.assigned_to ?? ""} options={[["","Sem pessoa específica"], ...members.map((member) => [member.user_id, member.profile.display_name])]} /></div><div className="grid gap-4 sm:grid-cols-3"><Field name="dueAt" label="Prazo" type="datetime-local" defaultValue={localDate(item?.due_at)} /><Select name="recurrence" label="Repetição" defaultValue={item?.recurrence ?? "none"} options={[["none","Não repetir"],["daily","Diária"],["weekly","Semanal"],["biweekly","Quinzenal"],["monthly","Mensal"]]} /><Field name="xp" label="XP" type="number" defaultValue={String(item?.xp ?? 10)} /></div></>; }
function ShoppingFields({ item, listId }: { item?: ShoppingItem; listId?: string }) { return <><input type="hidden" name="listId" value={listId ?? ""} /><Field name="product" label="Produto" defaultValue={item?.product} required /><div className="grid gap-4 sm:grid-cols-2"><Field name="quantity" label="Quantidade" defaultValue={item?.quantity ?? ""} placeholder="2 unidades" /><Field name="category" label="Categoria" defaultValue={item?.category ?? ""} placeholder="Alimentos" /></div><TextArea name="notes" label="Observações" defaultValue={item?.notes} /></>; }
function MissionFields({ item }: { item?: Mission }) { return <><Field name="name" label="Nome" defaultValue={item?.name} required /><TextArea name="description" label="Descrição" defaultValue={item?.description} /><div className="grid gap-4 sm:grid-cols-2"><Select name="missionType" label="Tipo" defaultValue={item?.mission_type ?? "custom"} options={[["daily","Diária"],["weekly","Semanal"],["special","Especial"],["custom","Personalizada"]]} /><Select name="frequency" label="Frequência" defaultValue={item?.frequency ?? "none"} options={[["none","Única"],["daily","Diária"],["weekly","Semanal"],["monthly","Mensal"]]} /></div><div className="grid gap-4 sm:grid-cols-2"><Field name="dueAt" label="Prazo" type="datetime-local" defaultValue={localDate(item?.due_at)} /><Field name="xp" label="XP" type="number" defaultValue={String(item?.xp ?? 50)} /></div><input type="hidden" name="assignment" value={item?.assignment ?? "home"} /></>; }
function AttentionFields({ item, members }: { item?: AttentionPoint; members: WorkspaceData["members"] }) { return <><Field name="title" label="Título" defaultValue={item?.title} required /><TextArea name="description" label="Descrição" defaultValue={item?.description} /><div className="grid gap-4 sm:grid-cols-2"><Field name="category" label="Categoria" defaultValue={item?.category ?? "Outros"} /><Select name="priority" label="Prioridade" defaultValue={item?.priority ?? "normal"} options={[["low","Baixa"],["normal","Normal"],["high","Alta"],["urgent","Urgente"]]} /></div><Select name="assignedTo" label="Responsável" defaultValue={item?.assigned_to ?? ""} options={[["","Todos"], ...members.map((member) => [member.user_id, member.profile.display_name])]} /></>; }
function RecordFields({ item }: { item?: HomeRecord }) { return <><Field name="title" label="Título" defaultValue={item?.title} required /><TextArea name="description" label="Descrição" defaultValue={item?.description} /><div className="grid gap-4 sm:grid-cols-2"><Field name="category" label="Categoria" defaultValue={item?.category ?? "Registro"} /><Field name="recordDate" label="Data" type="date" defaultValue={item?.record_date ?? new Date().toISOString().slice(0,10)} /></div></>; }

function Field({ name, label, type = "text", defaultValue, placeholder, required, disabled }: { name: string; label: string; type?: string; defaultValue?: string; placeholder?: string; required?: boolean; disabled?: boolean }) { return <label className="block text-sm font-medium">{label}<input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} required={required} disabled={disabled} className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-950" /></label>; }
function TextArea({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string | null }) { return <label className="block text-sm font-medium">{label}<textarea name={name} defaultValue={defaultValue ?? ""} rows={3} className="mt-1 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-600 dark:border-neutral-700 dark:bg-neutral-950" /></label>; }
function Select({ name, label, defaultValue, options }: { name: string; label: string; defaultValue: string; options: string[][] }) { return <label className="block text-sm font-medium">{label}<select name={name} defaultValue={defaultValue} className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-emerald-600 dark:border-neutral-700 dark:bg-neutral-950">{options.map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label>; }
function IconButton({ label, children, onClick, danger }: { label: string; children: ReactNode; onClick: () => void; danger?: boolean }) { return <button type="button" onClick={onClick} aria-label={label} title={label} className={cn("grid size-10 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-neutral-400 dark:hover:bg-neutral-800", danger && "hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400")}>{children}</button>; }
function SectionTitle({ icon: Icon, title, href }: { icon: typeof Home; title: string; href?: string }) { return <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Icon size={18} className="text-emerald-700 dark:text-emerald-400" /><h2 className="font-semibold">{title}</h2></div>{href ? <Link className="text-sm font-semibold text-emerald-700 dark:text-emerald-400" href={href}>Ver tudo</Link> : null}</div>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-lg bg-white/10 p-3"><p className="text-xl font-semibold">{value}</p><p className="mt-1 text-xs text-neutral-400">{label}</p></div>; }
function submitForm(event: FormEvent<HTMLFormElement>, submit: (data: FormData) => void) { event.preventDefault(); submit(new FormData(event.currentTarget)); }
function priorityLabel(value: Task["priority"]) { return ({ low: "Baixa", normal: "Normal", high: "Alta", urgent: "Urgente" })[value]; }
function assignmentLabel(value: Task["assignment"]) { return ({ self: "Eu", partner: "Parceiro(a)", both: "Ambos", home: "Casa" })[value]; }
function missionTypeLabel(value: Mission["mission_type"]) { return ({ daily: "Diária", weekly: "Semanal", special: "Especial", custom: "Personalizada" })[value]; }
function dateLabel(value: string, withTime = false) { return new Date(value).toLocaleString("pt-BR", withTime ? { dateStyle: "short", timeStyle: "short" } : { dateStyle: "short" }); }
function localDate(value?: string | null) { if (!value) return ""; const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0,16); }
