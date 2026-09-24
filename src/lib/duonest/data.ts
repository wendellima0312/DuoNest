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
  return { supabase, userId, email: typeof claims?.email === "string" ? claims.email : null };
});

export const getCurrentContext = cache(async () => {
  const { supabase, userId, email } = await getIdentity();
  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("home_members").select("home_id, role").eq("user_id", userId).limit(1).maybeSingle(),
  ]);

  if (!profile || !membership) return { supabase, userId, email, profile: profile as Profile | null, home: null, role: null };
  const { data: home } = await supabase.from("homes").select("*").eq("id", membership.home_id).single();
  return { supabase, userId, email, profile: profile as Profile, home: home as Home | null, role: membership.role as "owner" | "member" };
});

function ensureNoError(results: Array<{ error: { message: string } | null }>) {
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message);
}

export const getWorkspaceData = cache(async (): Promise<WorkspaceData> => {
  const context = await getCurrentContext();
  if (!context.profile || !context.home || !context.role) redirect("/onboarding");
  const { supabase, userId, home, profile, role } = context;

  const results = await Promise.all([
    supabase.from("tasks").select("*").eq("home_id", home.id).order("status").order("due_at", { ascending: true, nullsFirst: false }),
    supabase.from("task_completions").select("task_id").eq("home_id", home.id),
    supabase.from("missions").select("*").eq("home_id", home.id).order("due_at", { ascending: true, nullsFirst: false }),
    supabase.from("mission_completions").select("mission_id").eq("home_id", home.id),
    supabase.from("shopping_lists").select("id,name,store_name,completed_at").eq("home_id", home.id).order("created_at", { ascending: false }),
    supabase.from("shopping_items").select("id,list_id,product,quantity,category,notes,bought,bought_by,bought_at").eq("home_id", home.id).order("bought").order("created_at"),
    supabase.from("attention_points").select("*").eq("home_id", home.id).order("status").order("created_at", { ascending: false }),
    supabase.from("home_records").select("*").eq("home_id", home.id).order("record_date", { ascending: false }),
    supabase.from("activity_log").select("*").eq("home_id", home.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("achievements").select("*").order("threshold"),
    supabase.from("user_achievements").select("achievement_id").eq("home_id", home.id).eq("user_id", userId),
    supabase.from("home_members").select("id,user_id,role,joined_at").eq("home_id", home.id).order("joined_at"),
    supabase.from("home_invites").select("id,code,email,status,expires_at,created_at").eq("home_id", home.id).order("created_at", { ascending: false }),
    supabase.from("notifications").select("id,title,body,type,read_at,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
  ]);
  ensureNoError(results);

  const memberRows = results[11].data ?? [];
  const memberIds = memberRows.map((member) => member.user_id);
  const { data: memberProfiles, error: memberProfilesError } = memberIds.length
    ? await supabase.from("profiles").select("*").in("id", memberIds)
    : { data: [], error: null };
  if (memberProfilesError) throw new Error(memberProfilesError.message);
  const profileById = new Map((memberProfiles ?? []).map((memberProfile) => [memberProfile.id, memberProfile as Profile]));
  const members = memberRows.flatMap((member) => {
    const memberProfile = profileById.get(member.user_id);
    return memberProfile ? [{ ...member, profile: memberProfile } as Member] : [];
  });

  return {
    userId,
    profile,
    home,
    role,
    members,
    tasks: results[0].data ?? [],
    taskCompletionIds: (results[1].data ?? []).map((item) => item.task_id),
    missions: results[2].data ?? [],
    missionCompletionIds: (results[3].data ?? []).map((item) => item.mission_id),
    shoppingLists: results[4].data ?? [],
    shoppingItems: results[5].data ?? [],
    attentionPoints: results[6].data ?? [],
    records: results[7].data ?? [],
    activities: results[8].data ?? [],
    achievements: results[9].data ?? [],
    unlockedAchievementIds: (results[10].data ?? []).map((item) => item.achievement_id),
    invites: results[12].data ?? [],
    notifications: results[13].data ?? [],
  } as WorkspaceData;
});
