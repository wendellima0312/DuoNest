export type Profile = {
  id: string;
  display_name: string;
  email: string | null;
  avatar_url: string | null;
  avatar_config: AvatarConfig | null;
  level: number;
  xp: number;
  tasks_completed: number;
  tasks_late: number;
  missions_completed: number;
  streak_days: number;
};

export type AvatarConfig = {
  presentation: "masculine" | "feminine";
  skin: "light" | "medium" | "deep" | "dark";
  hair: "short" | "curly" | "long" | "bun";
  hairColor: "black" | "brown" | "blonde" | "red";
  shirtColor: "emerald" | "blue" | "coral" | "violet";
};

export type Home = {
  id: string;
  name: string;
  image_url: string | null;
  created_by: string;
  level: number;
  xp: number;
  settings: Record<string, unknown>;
};

export type Member = {
  id: string;
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
  profile: Profile;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  assigned_to: string | null;
  assignment: "self" | "partner" | "both" | "home";
  priority: "low" | "normal" | "high" | "urgent";
  starts_at: string | null;
  due_at: string | null;
  recurrence:
    | "none"
    | "daily"
    | "business_days"
    | "weekends"
    | "weekly"
    | "biweekly"
    | "monthly"
    | "custom";
  xp: number;
  status: "open" | "in_progress" | "resolved";
  notes: string | null;
  created_by: string;
  created_at: string;
};

export type TaskCompletion = {
  id: string;
  task_id: string;
  completed_by: string;
  xp_awarded: number;
  completed_at: string;
  cycle_due_at: string;
};

export type Mission = {
  id: string;
  name: string;
  description: string | null;
  mission_type: "daily" | "weekly" | "special" | "custom";
  assigned_to: string | null;
  assignment: "self" | "partner" | "both" | "home";
  frequency: string;
  due_at: string | null;
  xp: number;
  created_by: string;
  is_system_generated: boolean;
  goal_type:
    | "task_count"
    | "category_tasks"
    | "shopping_items"
    | "attention_points"
    | null;
  goal_category: string | null;
  target_count: number | null;
  progress_count: number;
  period_start: string | null;
  source_key: string | null;
};

export type ShoppingList = {
  id: string;
  name: string;
  store_name: string | null;
  completed_at: string | null;
};
export type ShoppingItem = {
  id: string;
  list_id: string;
  product: string;
  quantity: string | null;
  category: string | null;
  notes: string | null;
  bought: boolean;
  bought_by: string | null;
  bought_at: string | null;
};
export type AttentionPoint = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  assigned_to: string | null;
  priority: Task["priority"];
  status: Task["status"];
  resolution_notes: string | null;
  created_at: string;
};
export type HomeRecord = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  record_date: string;
  created_by: string;
  created_at: string;
};
export type Activity = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};
export type Achievement = {
  id: string;
  code: string;
  name: string;
  description: string;
  threshold: number | null;
  icon: string | null;
};
export type Invite = {
  id: string;
  code: string;
  email: string | null;
  status: string;
  expires_at: string;
  created_at: string;
};
export type Notification = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  read_at: string | null;
  created_at: string;
};
export type HouseholdExpense = {
  id: string;
  description: string;
  category: string;
  amount: number;
  expense_date: string;
  status: "pending" | "paid";
  paid_by: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
};
export type HouseholdPlan = {
  id: string;
  title: string;
  description: string | null;
  plan_type: "purchase" | "improvement" | "maintenance" | "other";
  status: "planned" | "in_progress" | "completed" | "cancelled";
  target_date: string | null;
  estimated_cost: number | null;
  responsible_id: string | null;
  created_by: string;
  created_at: string;
};
export type ScheduleItem = {
  id: string;
  title: string;
  description: string | null;
  day_scope: "anyday" | "business_days" | "weekends" | "specific";
  scheduled_date: string | null;
  start_time: string;
  duration_minutes: number;
  room: HomeRoom;
  responsible_id: string | null;
  status: "planned" | "completed" | "cancelled";
  created_by: string;
  created_at: string;
};
export type HomePresence = {
  home_id: string;
  user_id: string;
  room: HomeRoom;
  updated_at: string;
};
export type HomeRoom =
  "Sala" | "Cozinha" | "Quarto" | "Banheiro" | "Escritorio" | "Area externa";

export type WorkspaceData = {
  userId: string;
  profile: Profile;
  home: Home;
  role: "owner" | "member";
  members: Member[];
  tasks: Task[];
  taskCompletions: TaskCompletion[];
  taskCompletionIds: string[];
  missions: Mission[];
  missionCompletionIds: string[];
  shoppingLists: ShoppingList[];
  shoppingItems: ShoppingItem[];
  attentionPoints: AttentionPoint[];
  records: HomeRecord[];
  activities: Activity[];
  achievements: Achievement[];
  unlockedAchievementIds: string[];
  invites: Invite[];
  notifications: Notification[];
  expenses: HouseholdExpense[];
  plans: HouseholdPlan[];
  scheduleItems: ScheduleItem[];
  presence: HomePresence[];
};
