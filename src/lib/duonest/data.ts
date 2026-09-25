import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Home, Member, Profile, WorkspaceData } from "./types";

export const getIdentity = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const userId = claims?.sub;
  if (error || typeof userId !== "string") redirect("/login");
  return {
    supabase,
    userId,
    email: typeof claims?.email === "string" ? claims.email : null,
  };
});

export const getCurrentContext = cache(async () => {
  const { supabase, userId, email } = await getIdentity();
  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("home_members")
      .select("home_id, role")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle(),
  ]);

  if (!profile || !membership)
    return {
      supabase,
      userId,
      email,
      profile: profile as Profile | null,
      home: null,
      role: null,
    };
  const { data: home } = await supabase
    .from("homes")
    .select("*")
    .eq("id", membership.home_id)
    .single();
  return {
    supabase,
    userId,
    email,
    profile: profile as Profile,
    home: home as Home | null,
    role: membership.role as "owner" | "member",
  };
});

function ensureNoError(results: Array<{ error: { message: string } | null }>) {
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message);
}

export const getShellData = cache(async () => {
  const context = await getCurrentContext();
  if (!context.profile || !context.home || !context.role)
    redirect("/onboarding");

  const { count, error } = await context.supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", context.userId)
    .is("read_at", null);

  if (error) throw new Error(error.message);

  return {
    profile: context.profile,
    home: context.home,
    role: context.role,
    unreadCount: count ?? 0,
  };
});

export const getWorkspaceData = cache(
  async (view: string): Promise<WorkspaceData> => {
    const context = await getCurrentContext();
    if (!context.profile || !context.home || !context.role)
      redirect("/onboarding");
    const { supabase, userId, home, profile, role } = context;

    const needsTasks = [
      "dashboard",
      "tarefas",
      "calendario",
      "historico",
      "ocupacao",
    ].includes(view);
    const needsMissions = ["dashboard", "missoes", "calendario"].includes(view);
    const needsMissionCompletions = ["dashboard", "missoes"].includes(view);
    const needsShoppingLists = view === "mercado";
    const needsShoppingItems = ["dashboard", "mercado"].includes(view);
    const needsMembers = [
      "dashboard",
      "tarefas",
      "missoes",
      "pontos",
      "membros",
      "financeiro",
      "planejamentos",
      "historico",
      "ocupacao",
    ].includes(view);
    const skip = () => Promise.resolve({ data: [], error: null });

    const results = await Promise.all([
      needsTasks
        ? supabase
            .from("tasks")
            .select("*")
            .eq("home_id", home.id)
            .order("status")
            .order("due_at", { ascending: true, nullsFirst: false })
        : skip(),
      needsMissions
        ? supabase
            .from("missions")
            .select("*")
            .eq("home_id", home.id)
            .eq("is_system_generated", true)
            .gte("due_at", new Date().toISOString())
            .order("due_at", { ascending: true, nullsFirst: false })
        : skip(),
      needsMissionCompletions
        ? supabase
            .from("mission_completions")
            .select("mission_id")
            .eq("home_id", home.id)
        : skip(),
      needsShoppingLists
        ? supabase
            .from("shopping_lists")
            .select("id,name,store_name,completed_at")
            .eq("home_id", home.id)
            .order("created_at", { ascending: false })
        : skip(),
      needsShoppingItems
        ? supabase
            .from("shopping_items")
            .select(
              "id,list_id,product,quantity,category,notes,bought,bought_by,bought_at",
            )
            .eq("home_id", home.id)
            .order("bought")
            .order("created_at")
        : skip(),
      view === "pontos"
        ? supabase
            .from("attention_points")
            .select("*")
            .eq("home_id", home.id)
            .order("status")
            .order("created_at", { ascending: false })
        : skip(),
      view === "registros"
        ? supabase
            .from("home_records")
            .select("*")
            .eq("home_id", home.id)
            .order("record_date", { ascending: false })
        : skip(),
      ["dashboard", "historico", "tarefas"].includes(view)
        ? supabase
            .from("activity_log")
            .select("*")
            .eq("home_id", home.id)
            .order("created_at", { ascending: false })
            .limit(view === "historico" ? 100 : view === "tarefas" ? 60 : 20)
        : skip(),
      view === "conquistas"
        ? supabase.from("achievements").select("*").order("threshold")
        : skip(),
      view === "conquistas"
        ? supabase
            .from("user_achievements")
            .select("achievement_id")
            .eq("home_id", home.id)
            .eq("user_id", userId)
        : skip(),
      needsMembers
        ? supabase
            .from("home_members")
            .select("id,user_id,role,joined_at")
            .eq("home_id", home.id)
            .order("joined_at")
        : skip(),
      view === "membros"
        ? supabase
            .from("home_invites")
            .select("id,code,email,status,expires_at,created_at")
            .eq("home_id", home.id)
            .order("created_at", { ascending: false })
        : skip(),
      view === "notificacoes"
        ? supabase
            .from("notifications")
            .select("id,title,body,type,read_at,created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(30)
        : skip(),
      ["historico", "tarefas"].includes(view)
        ? supabase
            .from("task_completions")
            .select(
              "id,task_id,completed_by,xp_awarded,completed_at,cycle_due_at",
            )
            .eq("home_id", home.id)
            .order("completed_at", { ascending: false })
        : skip(),
      view === "financeiro"
        ? supabase
            .from("household_expenses")
            .select("*")
            .eq("home_id", home.id)
            .order("expense_date", { ascending: false })
        : skip(),
      view === "planejamentos"
        ? supabase
            .from("household_plans")
            .select("*")
            .eq("home_id", home.id)
            .order("status")
            .order("target_date", { ascending: true, nullsFirst: false })
        : skip(),
      view === "ocupacao"
        ? supabase
            .from("schedule_items")
            .select("*")
            .eq("home_id", home.id)
            .order("start_time")
        : skip(),
      view === "ocupacao"
        ? supabase
            .from("home_presence")
            .select("home_id,user_id,room,updated_at")
            .eq("home_id", home.id)
        : skip(),
    ]);
    ensureNoError(results);

    const memberRows = results[10].data ?? [];
    const memberIds = memberRows.map((member) => member.user_id);
    const { data: memberProfiles, error: memberProfilesError } =
      memberIds.length
        ? await supabase.from("profiles").select("*").in("id", memberIds)
        : { data: [], error: null };
    if (memberProfilesError) throw new Error(memberProfilesError.message);
    const profileById = new Map(
      (memberProfiles ?? []).map((memberProfile) => [
        memberProfile.id,
        memberProfile as Profile,
      ]),
    );
    const members = memberRows.flatMap((member) => {
      const memberProfile = profileById.get(member.user_id);
      return memberProfile
        ? [{ ...member, profile: memberProfile } as Member]
        : [];
    });

    return {
      userId,
      profile,
      home,
      role,
      members,
      tasks: results[0].data ?? [],
      taskCompletions: results[13].data ?? [],
      taskCompletionIds: [],
      missions: results[1].data ?? [],
      missionCompletionIds: (results[2].data ?? []).map(
        (item) => item.mission_id,
      ),
      shoppingLists: results[3].data ?? [],
      shoppingItems: results[4].data ?? [],
      attentionPoints: results[5].data ?? [],
      records: results[6].data ?? [],
      activities: results[7].data ?? [],
      achievements: results[8].data ?? [],
      unlockedAchievementIds: (results[9].data ?? []).map(
        (item) => item.achievement_id,
      ),
      invites: results[11].data ?? [],
      notifications: results[12].data ?? [],
      expenses: results[14].data ?? [],
      plans: results[15].data ?? [],
      scheduleItems: results[16].data ?? [],
      presence: results[17].data ?? [],
    } as WorkspaceData;
  },
);
