"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  CheckSquare,
  ChevronRight,
  ClipboardList,
  History,
  Home,
  LogOut,
  MapPinned,
  Menu,
  Plus,
  Settings,
  ShoppingCart,
  Sparkles,
  WalletCards,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { signOut } from "@/features/auth/actions";
import { ThemeToggle } from "./theme-toggle";
import { BrowserNotificationListener } from "@/features/duonest/browser-notifications";
import type { AvatarConfig } from "@/lib/duonest/types";

const navigation = [
  { href: "/dashboard", label: "Visão geral", icon: Home },
  { href: "/tarefas", label: "Tarefas", icon: CheckSquare },
  { href: "/calendario", label: "Calendário", icon: CalendarDays },
  { href: "/ocupacao", label: "Ocupação", icon: MapPinned },
  { href: "/missoes", label: "Missões", icon: Sparkles },
  { href: "/mercado", label: "Mercado", icon: ShoppingCart },
  { href: "/financeiro", label: "Financeiro", icon: WalletCards },
  { href: "/planejamentos", label: "Planejamentos", icon: ClipboardList },
  { href: "/historico", label: "Histórico", icon: History },
  { href: "/pontos-atencao", label: "Pontos de atenção", icon: Bell },
  { href: "/registros", label: "Registros", icon: ChevronRight },
  { href: "/conquistas", label: "Conquistas", icon: Sparkles },
];

const bottomNavigation = [
  navigation[0],
  navigation[1],
  navigation[2],
  navigation[3],
];

export function AppShell({
  children,
  userId,
  userName,
  userAvatar,
  userAvatarConfig,
  homeName,
  unreadCount,
}: {
  children: React.ReactNode;
  userId: string;
  userName: string;
  userAvatar: string | null;
  userAvatarConfig: AvatarConfig | null;
  homeName: string;
  unreadCount: number;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const nav = (
    <>
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5 dark:border-neutral-800">
        <Link
          href="/dashboard"
          className="flex items-center gap-3"
          onClick={() => setMenuOpen(false)}
        >
          <BrandLogo size={40} />
          <span>
            <strong className="block">DuoNest</strong>
            <small className="block max-w-36 truncate text-slate-500 dark:text-neutral-400">
              {homeName}
            </small>
          </span>
        </Link>
        <button
          className="grid size-10 place-items-center lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-label="Fechar menu"
        >
          <X size={22} />
        </button>
      </div>
      <nav className="space-y-1 overflow-y-auto px-3 py-4">
        {navigation.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
                active &&
                  "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-slate-200 p-3 dark:border-neutral-800">
        <Link
          href="/perfil"
          onClick={() => setMenuOpen(false)}
          className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-slate-100 dark:hover:bg-neutral-800"
        >
          <Avatar
            name={userName}
            src={userAvatar}
            config={userAvatarConfig}
            size={28}
          />
          <span className="min-w-0 flex-1 truncate">{userName}</span>
        </Link>
        <Link
          href="/configuracoes"
          onClick={() => setMenuOpen(false)}
          className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-slate-100 dark:hover:bg-neutral-800"
        >
          <Settings size={18} />
          Configurações
        </Link>
        <form action={signOut}>
          <button className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30">
            <LogOut size={18} />
            Sair
          </button>
        </form>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-stone-100 text-slate-950 dark:bg-neutral-950 dark:text-neutral-100">
      <BrowserNotificationListener userId={userId} />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-slate-200 bg-white lg:flex dark:border-neutral-800 dark:bg-neutral-900">
        {nav}
      </aside>
      {menuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 bg-black/45"
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar menu"
          />
          <aside className="relative flex h-full w-[min(86vw,320px)] flex-col bg-white shadow-xl dark:bg-neutral-900">
            {nav}
          </aside>
        </div>
      ) : null}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-stone-100/90 px-4 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                className="grid size-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white lg:hidden dark:border-neutral-700 dark:bg-neutral-900"
                onClick={() => setMenuOpen(true)}
                aria-label="Abrir menu"
              >
                <Menu size={21} />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-500 dark:text-neutral-400">
                  {homeName}
                </p>
                <p className="truncate font-semibold">Olá, {userName}.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link
                href="/configuracoes/notificacoes"
                className="relative grid size-10 place-items-center rounded-lg border border-slate-200 bg-white dark:border-neutral-700 dark:bg-neutral-900"
                aria-label="Notificações"
              >
                <Bell size={18} />
                {unreadCount ? (
                  <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                ) : null}
              </Link>
              <Link
                href="/tarefas?novo=1"
                className="hidden h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 sm:flex"
              >
                <Plus size={17} />
                Nova tarefa
              </Link>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 pb-28 pt-5 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>
      <Link
        href="/tarefas?novo=1"
        className="fixed bottom-20 right-4 z-30 grid size-14 place-items-center rounded-full bg-emerald-700 text-white shadow-lg lg:hidden"
        aria-label="Nova tarefa"
      >
        <Plus size={25} />
      </Link>
      <nav className="fixed bottom-0 left-0 right-0 z-20 grid grid-cols-4 border-t border-slate-200 bg-white px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden dark:border-neutral-800 dark:bg-neutral-900">
        {bottomNavigation.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-medium text-slate-500 dark:text-neutral-400",
                active && "text-emerald-700 dark:text-emerald-400",
              )}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
