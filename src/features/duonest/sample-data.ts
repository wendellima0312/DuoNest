import type { Activity, AttentionPoint, Mission, ShoppingItem, Task } from "@/types/duonest";

export const profile = {
  name: "Wendel",
  homeName: "Nosso Cantinho",
  level: 12,
  xp: 2840,
  nextLevelXp: 3200,
  completedTasks: 184,
  delayedTasks: 6,
  missions: 61,
  streak: 14,
};

export const homeStats = {
  level: 18,
  xp: 8450,
  nextLevelXp: 9100,
  weeklyCompletion: 89,
  weeklyXp: 420,
  completedWeek: 32,
  delayedWeek: 4,
};

export const tasks: Task[] = [
  {
    id: "retirar-lixo",
    title: "Retirar lixo",
    category: "Limpeza",
    responsible: "Eu",
    priority: "Alta",
    time: "18:00",
    due: "Hoje",
    xp: 20,
    done: false,
    recurring: "Diariamente",
  },
  {
    id: "organizar-cozinha",
    title: "Organizar cozinha",
    category: "Cozinha",
    responsible: "Ambos",
    priority: "Normal",
    time: "20:00",
    due: "Hoje",
    xp: 30,
    done: false,
  },
  {
    id: "comprar-limpeza",
    title: "Comprar produtos de limpeza",
    category: "Compras",
    responsible: "Parceiro(a)",
    priority: "Normal",
    time: "13:10",
    due: "Hoje",
    xp: 20,
    done: true,
  },
  {
    id: "banheiro",
    title: "Limpar banheiro",
    category: "Limpeza",
    responsible: "Eu",
    priority: "Urgente",
    time: "09:00",
    due: "Atrasada",
    xp: 40,
    done: false,
    recurring: "Semanalmente",
  },
  {
    id: "conta-energia",
    title: "Conferir conta de energia",
    category: "Financeiro",
    responsible: "Ambos",
    priority: "Alta",
    time: "Amanha",
    due: "Amanha",
    xp: 10,
    done: true,
  },
];

export const missions: Mission[] = [
  {
    id: "casa-organizada",
    title: "Casa organizada",
    description: "Concluir as rotinas essenciais de hoje sem transformar isso em disputa.",
    progress: 2,
    total: 3,
    xp: 50,
    frequency: "Diaria",
  },
  {
    id: "semana-leve",
    title: "Semana leve",
    description: "Manter tarefas atrasadas abaixo de 3 no fechamento da semana.",
    progress: 4,
    total: 7,
    xp: 100,
    frequency: "Semanal",
  },
  {
    id: "mercado-em-dia",
    title: "Mercado em dia",
    description: "Finalizar a lista colaborativa antes do fim de semana.",
    progress: 6,
    total: 9,
    xp: 40,
    frequency: "Especial",
  },
];

export const shoppingItems: ShoppingItem[] = [
  { id: "arroz", product: "Arroz", quantity: "1 pacote", category: "Mercado", bought: false },
  { id: "feijao", product: "Feijao", quantity: "1 pacote", category: "Mercado", bought: false },
  { id: "leite", product: "Leite", quantity: "2 unidades", category: "Mercado", bought: true },
  { id: "cafe", product: "Cafe", quantity: "1 pacote", category: "Mercado", bought: false },
  { id: "detergente", product: "Detergente", quantity: "3 unidades", category: "Limpeza", bought: true },
  { id: "racao", product: "Racao", quantity: "1 saco", category: "Pets", bought: false },
  { id: "pilhas", product: "Pilhas", quantity: "4 unidades", category: "Casa", bought: false },
];

export const activities: Activity[] = [
  {
    id: "1",
    time: "14:32",
    actor: "Wendel",
    action: "concluiu",
    detail: "Lavar a louca",
    xp: 20,
  },
  {
    id: "2",
    time: "13:10",
    actor: "Parceiro(a)",
    action: "adicionou",
    detail: "Comprar cafe",
  },
  {
    id: "3",
    time: "Ontem, 21:45",
    actor: "Casa",
    action: "concluiu missao",
    detail: "Organizar cozinha",
    xp: 50,
  },
];

export const attentionPoints: AttentionPoint[] = [
  {
    id: "luz-banheiro",
    title: "Luz do banheiro esta queimada",
    priority: "Alta",
    status: "Aberto",
    category: "Manutencao",
    owner: "Ambos",
  },
  {
    id: "armario",
    title: "Precisamos organizar o armario",
    priority: "Normal",
    status: "Em andamento",
    category: "Organizacao",
    owner: "Eu",
  },
  {
    id: "produtos",
    title: "Produtos de limpeza estao acabando",
    priority: "Urgente",
    status: "Aberto",
    category: "Compras",
    owner: "Parceiro(a)",
  },
];

export const achievements = [
  "Primeira Missao",
  "Casa em Ordem",
  "Mestre da Organizacao",
  "Semana Perfeita",
  "Mercado em Dia",
  "Sequencia de 30 dias",
];
