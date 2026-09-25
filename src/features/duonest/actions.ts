"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: boolean; message: string };

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optional(formData: FormData, key: string) {
  const result = text(formData, key);
  return result || null;
}

function isoDate(formData: FormData, key: string) {
  const result = text(formData, key);
  if (!result) return null;
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(result))
    return new Date(result).toISOString();

  const [datePart, timePart = "00:00"] = result.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second = 0] = timePart.split(":").map(Number);
  const timezoneOffset = Number(text(formData, "timezoneOffset")) || 0;
  return new Date(
    Date.UTC(year, month - 1, day, hour, minute, second) +
      timezoneOffset * 60_000,
  ).toISOString();
}

function taskDueAt(formData: FormData, recurrence: string) {
  const dueAt = isoDate(formData, "dueAt");
  if (dueAt || recurrence === "none" || recurrence === "custom") return dueAt;
  const nextCycle = new Date();
  nextCycle.setDate(nextCycle.getDate() + 1);
  while (recurrence === "business_days" || recurrence === "weekends") {
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Bahia",
      weekday: "short",
    }).format(nextCycle);
    const isWeekend = weekday === "Sat" || weekday === "Sun";
    if (
      (recurrence === "business_days" && !isWeekend) ||
      (recurrence === "weekends" && isWeekend)
    )
      break;
    nextCycle.setDate(nextCycle.getDate() + 1);
  }
  return nextCycle.toISOString();
}

function refresh() {
  revalidatePath("/", "layout");
}

async function requireContext() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (typeof userId !== "string") return null;
  const { data: membership } = await supabase
    .from("home_members")
    .select("home_id,role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return membership
    ? {
        supabase,
        userId,
        homeId: membership.home_id,
        role: membership.role as "owner" | "member",
      }
    : null;
}

function failure(message: string): ActionResult {
  return { ok: false, message };
}

function success(message: string): ActionResult {
  refresh();
  return { ok: true, message };
}

function databaseFailure(message: string): ActionResult {
  if (message.includes("TASK_OVERDUE_EXTEND_REQUIRED"))
    return failure(
      "O prazo venceu. Quem criou a tarefa precisa prorrogá-la antes da conclusão.",
    );
  if (message.includes("ONLY_TASK_CREATOR_CAN_EXTEND"))
    return failure("Somente quem criou a tarefa pode prorrogar este prazo.");
  if (message.includes("TASK_EXTENSION_MUST_BE_FUTURE"))
    return failure("Escolha um novo prazo no futuro.");
  return failure(message);
}

export async function createTask(formData: FormData): Promise<ActionResult> {
  const context = await requireContext();
  if (!context) return failure("Sessão ou casa não encontrada.");
  const title = text(formData, "title");
  if (!title) return failure("Informe o título da tarefa.");
  const recurrence = text(formData, "recurrence") || "none";
  const { error } = await context.supabase.from("tasks").insert({
    home_id: context.homeId,
    title,
    description: optional(formData, "description"),
    category: text(formData, "category") || "Outros",
    assigned_to: optional(formData, "assignedTo"),
    assignment: text(formData, "assignment") || "both",
    priority: text(formData, "priority") || "normal",
    due_at: taskDueAt(formData, recurrence),
    recurrence,
    xp: Math.max(0, Number(text(formData, "xp")) || 10),
    created_by: context.userId,
  });
  return error ? failure(error.message) : success("Tarefa criada.");
}

export async function updateTask(formData: FormData): Promise<ActionResult> {
  const context = await requireContext();
  if (!context) return failure("Sessão expirada.");
  const id = text(formData, "id");
  const title = text(formData, "title");
  if (!id || !title) return failure("Tarefa inválida.");
  const recurrence = text(formData, "recurrence") || "none";
  const { error } = await context.supabase
    .from("tasks")
    .update({
      title,
      description: optional(formData, "description"),
      category: text(formData, "category") || "Outros",
      assigned_to: optional(formData, "assignedTo"),
      assignment: text(formData, "assignment") || "both",
      priority: text(formData, "priority") || "normal",
      due_at: taskDueAt(formData, recurrence),
      recurrence,
      xp: Math.max(0, Number(text(formData, "xp")) || 10),
    })
    .eq("id", id)
    .eq("home_id", context.homeId);
  return error ? databaseFailure(error.message) : success("Tarefa atualizada.");
}

export async function toggleTask(
  id: string,
  resolved: boolean,
): Promise<ActionResult> {
  const context = await requireContext();
  if (!context) return failure("Sessão expirada.");
  const { error } = await context.supabase
    .from("tasks")
    .update({ status: resolved ? "resolved" : "open" })
    .eq("id", id)
    .eq("home_id", context.homeId);
  return error
    ? databaseFailure(error.message)
    : success(
        resolved ? "Tarefa concluída e XP registrado." : "Tarefa reaberta.",
      );
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const context = await requireContext();
  if (!context) return failure("Sessão expirada.");
  const { error } = await context.supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("home_id", context.homeId);
  return error ? failure(error.message) : success("Tarefa removida.");
}

const scheduleScopes = new Set([
  "anyday",
  "business_days",
  "weekends",
  "specific",
]);
const scheduleRooms = new Set([
  "Sala",
  "Cozinha",
  "Quarto",
  "Banheiro",
  "Escritorio",
  "Area externa",
]);

function scheduleValues(formData: FormData) {
  const title = text(formData, "title");
  const dayScope = text(formData, "dayScope") || "anyday";
  const room = text(formData, "room") || "Sala";
  const durationMinutes = Number(text(formData, "durationMinutes"));
  if (
    !title ||
    !scheduleScopes.has(dayScope) ||
    !scheduleRooms.has(room) ||
    durationMinutes < 15 ||
    durationMinutes > 720
  )
    return null;
  return {
    title,
    description: optional(formData, "description"),
    day_scope: dayScope,
    scheduled_date:
      dayScope === "specific" ? optional(formData, "scheduledDate") : null,
    start_time: text(formData, "startTime") || "09:00",
    duration_minutes: durationMinutes,
    room,
    responsible_id: optional(formData, "responsibleId"),
  };
}

export async function createScheduleItem(
  formData: FormData,
): Promise<ActionResult> {
  const context = await requireContext();
  if (!context) return failure("Sessão expirada.");
  const values = scheduleValues(formData);
  if (!values || (values.day_scope === "specific" && !values.scheduled_date))
    return failure("Preencha os dados do compromisso.");
  const { error } = await context.supabase
    .from("schedule_items")
    .insert({ ...values, home_id: context.homeId, created_by: context.userId });
  return error
    ? failure(error.message)
    : success("Atividade adicionada à agenda do casal.");
}

export async function updateScheduleItem(
  formData: FormData,
): Promise<ActionResult> {
  const context = await requireContext();
  if (!context) return failure("Sessão expirada.");
  const id = text(formData, "id");
  const values = scheduleValues(formData);
  if (
    !id ||
    !values ||
    (values.day_scope === "specific" && !values.scheduled_date)
  )
    return failure("Compromisso inválido.");
  const { error } = await context.supabase
    .from("schedule_items")
    .update(values)
    .eq("id", id)
    .eq("home_id", context.homeId);
  return error ? failure(error.message) : success("Atividade atualizada.");
}

export async function updateScheduleStatus(
  id: string,
  status: "planned" | "completed" | "cancelled",
): Promise<ActionResult> {
  const context = await requireContext();
  if (!context) return failure("Sessão expirada.");
  const { error } = await context.supabase
    .from("schedule_items")
    .update({ status })
    .eq("id", id)
    .eq("home_id", context.homeId);
  return error
    ? failure(error.message)
    : success(
        status === "completed"
          ? "Atividade concluída."
          : "Situação atualizada.",
      );
}

export async function deleteScheduleItem(id: string): Promise<ActionResult> {
  const context = await requireContext();
  if (!context) return failure("Sessão expirada.");
  const { error } = await context.supabase
    .from("schedule_items")
    .delete()
    .eq("id", id)
    .eq("home_id", context.homeId);
  return error ? failure(error.message) : success("Atividade removida.");
}

export async function movePresence(room: string): Promise<ActionResult> {
  const context = await requireContext();
  if (!context || !scheduleRooms.has(room)) return failure("Cômodo inválido.");
  const { error } = await context.supabase
    .from("home_presence")
    .upsert(
      { home_id: context.homeId, user_id: context.userId, room },
      { onConflict: "home_id,user_id" },
    );
  return error ? failure(error.message) : success(`Você está em ${room}.`);
}

export async function createExpense(formData: FormData): Promise<ActionResult> {
  const context = await requireContext();
  if (!context) return failure("Sessão expirada.");
  const description = text(formData, "description");
  const amount = Number(text(formData, "amount").replace(",", "."));
  if (!description || !Number.isFinite(amount) || amount <= 0)
    return failure("Informe a descrição e um valor válido.");
  const { error } = await context.supabase.from("household_expenses").insert({
    home_id: context.homeId,
    description,
    category: text(formData, "category") || "Outros",
    amount,
    expense_date:
      text(formData, "expenseDate") || new Date().toISOString().slice(0, 10),
    status: text(formData, "status") || "pending",
    paid_by: optional(formData, "paidBy"),
    notes: optional(formData, "notes"),
    created_by: context.userId,
  });
  return error ? failure(error.message) : success("Gasto registrado.");
}

export async function updateExpense(formData: FormData): Promise<ActionResult> {
  const context = await requireContext();
  if (!context) return failure("Sessão expirada.");
  const id = text(formData, "id");
  const description = text(formData, "description");
  const amount = Number(text(formData, "amount").replace(",", "."));
  if (!id || !description || !Number.isFinite(amount) || amount <= 0)
    return failure("Gasto inválido.");
  const status = text(formData, "status") || "pending";
  const { error } = await context.supabase
    .from("household_expenses")
    .update({
      description,
      category: text(formData, "category") || "Outros",
      amount,
      expense_date: text(formData, "expenseDate"),
      status,
      paid_by:
        status === "paid"
          ? optional(formData, "paidBy") || context.userId
          : null,
      notes: optional(formData, "notes"),
    })
    .eq("id", id)
    .eq("home_id", context.homeId);
  return error ? failure(error.message) : success("Gasto atualizado.");
}

export async function toggleExpense(
  id: string,
  paid: boolean,
): Promise<ActionResult> {
  const context = await requireContext();
  if (!context) return failure("Sessão expirada.");
  const { error } = await context.supabase
    .from("household_expenses")
    .update({
      status: paid ? "paid" : "pending",
      paid_by: paid ? context.userId : null,
    })
    .eq("id", id)
    .eq("home_id", context.homeId);
  return error
    ? failure(error.message)
    : success(
        paid ? "Gasto marcado como pago." : "Gasto marcado como pendente.",
      );
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  const context = await requireContext();
  if (!context) return failure("Sessão expirada.");
  const { error } = await context.supabase
    .from("household_expenses")
    .delete()
    .eq("id", id)
    .eq("home_id", context.homeId);
  return error ? failure(error.message) : success("Gasto removido.");
}

export async function createPlan(formData: FormData): Promise<ActionResult> {
  const context = await requireContext();
  if (!context) return failure("Sessão expirada.");
  const title = text(formData, "title");
  if (!title) return failure("Informe o título do planejamento.");
  const costText = text(formData, "estimatedCost").replace(",", ".");
  const { error } = await context.supabase.from("household_plans").insert({
    home_id: context.homeId,
    title,
    description: optional(formData, "description"),
    plan_type: text(formData, "planType") || "other",
    status: text(formData, "status") || "planned",
    target_date: optional(formData, "targetDate"),
    estimated_cost: costText ? Number(costText) : null,
    responsible_id: optional(formData, "responsibleId"),
    created_by: context.userId,
  });
  return error ? failure(error.message) : success("Planejamento criado.");
}

export async function updatePlan(formData: FormData): Promise<ActionResult> {
  const context = await requireContext();
  if (!context) return failure("Sessão expirada.");
  const id = text(formData, "id");
  const title = text(formData, "title");
  if (!id || !title) return failure("Planejamento inválido.");
  const costText = text(formData, "estimatedCost").replace(",", ".");
  const { error } = await context.supabase
    .from("household_plans")
    .update({
      title,
      description: optional(formData, "description"),
      plan_type: text(formData, "planType") || "other",
      status: text(formData, "status") || "planned",
      target_date: optional(formData, "targetDate"),
      estimated_cost: costText ? Number(costText) : null,
      responsible_id: optional(formData, "responsibleId"),
    })
    .eq("id", id)
    .eq("home_id", context.homeId);
  return error ? failure(error.message) : success("Planejamento atualizado.");
}

export async function updatePlanStatus(
  id: string,
  status: "planned" | "in_progress" | "completed" | "cancelled",
): Promise<ActionResult> {
  const context = await requireContext();
  if (!context) return failure("Sessão expirada.");
  const { error } = await context.supabase
    .from("household_plans")
    .update({ status })
    .eq("id", id)
    .eq("home_id", context.homeId);
  return error ? failure(error.message) : success("Andamento atualizado.");
}

export async function deletePlan(id: string): Promise<ActionResult> {
  const context = await requireContext();
  if (!context) return failure("Sessão expirada.");
  const { error } = await context.supabase
    .from("household_plans")
    .delete()
    .eq("id", id)
    .eq("home_id", context.homeId);
  return error ? failure(error.message) : success("Planejamento removido.");
}

export async function createShoppingItem(
  formData: FormData,
): Promise<ActionResult> {
  const context = await requireContext();
  if (!context) return failure("Sessão expirada.");
  const product = text(formData, "product");
  if (!product) return failure("Informe o produto.");
  let listId = text(formData, "listId");
  if (!listId) {
    const { data: list, error } = await context.supabase
      .from("shopping_lists")
      .insert({
        home_id: context.homeId,
        name: "Lista principal",
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) return failure(error.message);
    listId = list.id;
  }
  const { error } = await context.supabase.from("shopping_items").insert({
    list_id: listId,
    home_id: context.homeId,
    product,
    quantity: optional(formData, "quantity"),
    category: optional(formData, "category"),
    notes: optional(formData, "notes"),
    created_by: context.userId,
  });
  return error ? failure(error.message) : success("Item adicionado à lista.");
}

export async function toggleShoppingItem(
  id: string,
  bought: boolean,
): Promise<ActionResult> {
  const context = await requireContext();
  if (!context) return failure("Sessão expirada.");
  const { error } = await context.supabase
    .from("shopping_items")
    .update({
      bought,
      bought_by: bought ? context.userId : null,
      bought_at: bought ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("home_id", context.homeId);
  return error
    ? failure(error.message)
    : success(
        bought ? "Item marcado como comprado." : "Item voltou para a lista.",
      );
}

export async function updateShoppingItem(
  formData: FormData,
): Promise<ActionResult> {
  const context = await requireContext();
  if (!context) return failure("Sessão expirada.");
  const id = text(formData, "id");
  const product = text(formData, "product");
  if (!id || !product) return failure("Item inválido.");
  const { error } = await context.supabase
    .from("shopping_items")
    .update({
      product,
      quantity: optional(formData, "quantity"),
      category: optional(formData, "category"),
      notes: optional(formData, "notes"),
    })
    .eq("id", id)
    .eq("home_id", context.homeId);
  return error ? failure(error.message) : success("Item atualizado.");
}

export async function deleteShoppingItem(id: string): Promise<ActionResult> {
  const context = await requireContext();
  if (!context) return failure("Sessão expirada.");
  const { error } = await context.supabase
    .from("shopping_items")
    .delete()
    .eq("id", id)
    .eq("home_id", context.homeId);
  return error ? failure(error.message) : success("Item removido.");
}

export async function createAttentionPoint(
  formData: FormData,
): Promise<ActionResult> {
  const context = await requireContext();
  if (!context) return failure("Sessão expirada.");
  const title = text(formData, "title");
  if (!title) return failure("Informe o título.");
  const { error } = await context.supabase.from("attention_points").insert({
    home_id: context.homeId,
    title,
    description: optional(formData, "description"),
    category: text(formData, "category") || "Outros",
    priority: text(formData, "priority") || "normal",
    assigned_to: optional(formData, "assignedTo"),
    created_by: context.userId,
  });
  return error ? failure(error.message) : success("Ponto de atenção criado.");
}

export async function resolveAttentionPoint(
  id: string,
  resolved: boolean,
): Promise<ActionResult> {
  const context = await requireContext();
  if (!context) return failure("Sessão expirada.");
  const { error } = await context.supabase
    .from("attention_points")
    .update({
      status: resolved ? "resolved" : "open",
      resolved_by: resolved ? context.userId : null,
      resolved_at: resolved ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("home_id", context.homeId);
  return error
    ? failure(error.message)
    : success(resolved ? "Ponto resolvido." : "Ponto reaberto.");
}

export async function updateAttentionPoint(
  formData: FormData,
): Promise<ActionResult> {
  const context = await requireContext();
  if (!context) return failure("Sessão expirada.");
  const id = text(formData, "id");
  const title = text(formData, "title");
  if (!id || !title) return failure("Ponto inválido.");
  const { error } = await context.supabase
    .from("attention_points")
    .update({
      title,
      description: optional(formData, "description"),
      category: text(formData, "category") || "Outros",
      priority: text(formData, "priority") || "normal",
      assigned_to: optional(formData, "assignedTo"),
    })
    .eq("id", id)
    .eq("home_id", context.homeId);
  return error ? failure(error.message) : success("Ponto atualizado.");
}

export async function deleteAttentionPoint(id: string): Promise<ActionResult> {
  const context = await requireContext();
  if (!context) return failure("Sessão expirada.");
  const { error } = await context.supabase
    .from("attention_points")
    .delete()
    .eq("id", id)
    .eq("home_id", context.homeId);
  return error ? failure(error.message) : success("Ponto removido.");
}

export async function createRecord(formData: FormData): Promise<ActionResult> {
  const context = await requireContext();
  if (!context) return failure("Sessão expirada.");
  const title = text(formData, "title");
  if (!title) return failure("Informe o título.");
  const { error } = await context.supabase.from("home_records").insert({
    home_id: context.homeId,
    title,
    description: optional(formData, "description"),
    category: text(formData, "category") || "Registro",
    record_date:
      text(formData, "recordDate") || new Date().toISOString().slice(0, 10),
    created_by: context.userId,
  });
  return error ? failure(error.message) : success("Registro criado.");
}

export async function deleteRecord(id: string): Promise<ActionResult> {
  const context = await requireContext();
  if (!context) return failure("Sessão expirada.");
  const { error } = await context.supabase
    .from("home_records")
    .delete()
    .eq("id", id)
    .eq("home_id", context.homeId);
  return error ? failure(error.message) : success("Registro removido.");
}

export async function updateRecord(formData: FormData): Promise<ActionResult> {
  const context = await requireContext();
  if (!context) return failure("Sessão expirada.");
  const id = text(formData, "id");
  const title = text(formData, "title");
  if (!id || !title) return failure("Registro inválido.");
  const { error } = await context.supabase
    .from("home_records")
    .update({
      title,
      description: optional(formData, "description"),
      category: text(formData, "category") || "Registro",
      record_date:
        text(formData, "recordDate") || new Date().toISOString().slice(0, 10),
    })
    .eq("id", id)
    .eq("home_id", context.homeId);
  return error ? failure(error.message) : success("Registro atualizado.");
}

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const context = await requireContext();
  if (!context) return failure("Sessão expirada.");
  const displayName = text(formData, "displayName");
  if (displayName.length < 2) return failure("Informe um nome válido.");
  const { error } = await context.supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", context.userId);
  return error ? failure(error.message) : success("Perfil atualizado.");
}

export async function updateHome(formData: FormData): Promise<ActionResult> {
  const context = await requireContext();
  if (!context || context.role !== "owner")
    return failure("Somente o proprietário pode alterar a casa.");
  const name = text(formData, "name");
  if (name.length < 2) return failure("Informe um nome válido.");
  const { error } = await context.supabase
    .from("homes")
    .update({ name })
    .eq("id", context.homeId);
  return error ? failure(error.message) : success("Casa atualizada.");
}

export async function createInvite(formData: FormData): Promise<ActionResult> {
  const context = await requireContext();
  if (!context || context.role !== "owner")
    return failure("Somente o proprietário pode convidar membros.");
  const email = text(formData, "email").toLowerCase();
  if (!email.includes("@")) return failure("Informe um e-mail válido.");
  const code = crypto
    .randomUUID()
    .replaceAll("-", "")
    .slice(0, 10)
    .toUpperCase();
  const { error } = await context.supabase
    .from("home_invites")
    .insert({
      home_id: context.homeId,
      invited_by: context.userId,
      email,
      code,
    });
  return error ? failure(error.message) : success(`Convite criado: ${code}`);
}

export async function markNotification(id: string): Promise<ActionResult> {
  const context = await requireContext();
  if (!context) return failure("Sessão expirada.");
  const { error } = await context.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", context.userId);
  return error ? failure(error.message) : success("Notificação lida.");
}

export async function removeMember(id: string): Promise<ActionResult> {
  const context = await requireContext();
  if (!context || context.role !== "owner")
    return failure("Somente o proprietário pode remover membros.");
  const { error } = await context.supabase
    .from("home_members")
    .delete()
    .eq("id", id)
    .eq("home_id", context.homeId)
    .neq("user_id", context.userId);
  return error ? failure(error.message) : success("Membro removido.");
}

export async function createHome(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (typeof userId !== "string") return failure("Sessão expirada.");
  const displayName = text(formData, "displayName");
  const homeName = text(formData, "homeName");
  if (displayName.length < 2 || homeName.length < 2)
    return failure("Preencha seu nome e o nome da casa.");
  const routines = formData.getAll("routines").map(String);
  const { error } = await supabase.rpc("create_home", {
    home_name: homeName,
    display_name: displayName,
    routine_names: routines,
  });
  if (error)
    return failure(
      error.code === "23505"
        ? "Você já participa de uma casa."
        : "Não foi possível criar a casa. Tente novamente.",
    );
  refresh();
  redirect("/dashboard");
}

export async function joinHome(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const email =
    typeof data?.claims?.email === "string" ? data.claims.email : null;
  if (typeof userId !== "string") return failure("Sessão expirada.");
  const code = text(formData, "code").toUpperCase();
  const displayName = text(formData, "displayName");
  if (!code || displayName.length < 2)
    return failure("Informe seu nome e o código do convite.");
  await supabase
    .from("profiles")
    .upsert(
      { id: userId, display_name: displayName, email },
      { onConflict: "id" },
    );
  const { data: invite, error: inviteError } = await supabase
    .from("home_invites")
    .select("id,home_id")
    .eq("code", code)
    .eq("status", "pending")
    .maybeSingle();
  if (inviteError || !invite)
    return failure("Convite inválido, expirado ou destinado a outro e-mail.");
  const { error: memberError } = await supabase
    .from("home_members")
    .insert({ home_id: invite.home_id, user_id: userId, role: "member" });
  if (memberError) return failure(memberError.message);
  await supabase
    .from("home_invites")
    .update({
      status: "accepted",
      accepted_by: userId,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invite.id);
  refresh();
  redirect("/dashboard");
}
