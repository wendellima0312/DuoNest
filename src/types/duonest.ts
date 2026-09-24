export type Priority = "Baixa" | "Normal" | "Alta" | "Urgente";
export type Responsible = "Eu" | "Parceiro(a)" | "Ambos";
export type Status = "Aberto" | "Em andamento" | "Resolvido";

export type Task = {
  id: string;
  title: string;
  category: string;
  responsible: Responsible;
  priority: Priority;
  time: string;
  due: string;
  xp: number;
  done: boolean;
  recurring?: string;
};

export type Mission = {
  id: string;
  title: string;
  description: string;
  progress: number;
  total: number;
  xp: number;
  frequency: "Diaria" | "Semanal" | "Especial";
};

export type ShoppingItem = {
  id: string;
  product: string;
  quantity: string;
  category: string;
  bought: boolean;
};

export type Activity = {
  id: string;
  time: string;
  actor: string;
  action: string;
  detail: string;
  xp?: number;
};

export type AttentionPoint = {
  id: string;
  title: string;
  priority: Priority;
  status: Status;
  category: string;
  owner: Responsible;
};
