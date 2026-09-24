"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Home,
  Medal,
  Menu,
  Plus,
  Settings,
  ShoppingCart,
  Sparkles,
  User,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

const primaryNav = [
  { href: "/dashboard", label: "Visao Geral", icon: Home },
  { href: "/tarefas", label: "Tarefas", icon: CheckSquare },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/missoes", label: "Missoes", icon: Sparkles },
  { href: "/mercado", label: "Mercado", icon: ShoppingCart },
  { href: "/pontos-atencao", label: "Pontos de atencao", icon: Wrench },
  { href: "/registros", label: "Registros", icon: ClipboardList },
  { href: "/conquistas", label: "Conquistas", icon: Medal },
];

const bottomNav = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/tarefas", label: "Tarefas", icon: CheckSquare },
  { href: "/mercado", label: "Mercado", icon: ShoppingCart },
  { href: "/perfil", label: "Perfil", icon: User },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-white/90 px-5 py-6 backdrop-blur lg:block">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-emerald-700 text-white">
            <Home size={20} />
          </div>
          <div>
            <p className="text-lg font-semibold">DuoNest</p>
            <p className="text-xs text-slate-500">Nosso Cantinho</p>
          </div>
        </Link>

        <nav className="mt-9 space-y-1">
          {primaryNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition",
                  active && "bg-emerald-50 text-emerald-800",
                  !active && "hover:bg-slate-100 hover:text-slate-950",
                )}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/configuracoes"
          className={cn(
            "absolute bottom-6 left-5 right-5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100",
            pathname.startsWith("/configuracoes") && "bg-emerald-50 text-emerald-800",
          )}
        >
          <Settings size={18} />
          Configuracoes
        </Link>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-[#f6f4ef]/90 px-4 py-3 backdrop-blur lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-3 lg:hidden">
              <Menu size={22} />
              <span className="font-semibold">DuoNest</span>
            </div>
            <div className="hidden lg:block">
              <p className="text-sm text-slate-500">Rotina compartilhada</p>
              <p className="font-semibold">Boa tarde, Wendel.</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="relative grid size-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm" aria-label="Notificacoes">
                <Bell size={18} />
                <span className="absolute right-1 top-1 size-2.5 rounded-full bg-emerald-600" />
              </button>
              <button className="hidden items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 sm:flex">
                <Plus size={17} />
                Adicionar
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 pb-28 pt-5 lg:px-8 lg:pb-10">{children}</main>
      </div>

      <button className="fixed bottom-7 left-1/2 z-30 grid size-14 -translate-x-1/2 place-items-center rounded-full bg-emerald-700 text-white shadow-xl shadow-emerald-900/20 lg:hidden" aria-label="Adicionar">
        <Plus size={26} />
      </button>

      <nav className="fixed bottom-0 left-0 right-0 z-20 grid grid-cols-4 border-t border-slate-200 bg-white px-2 pb-3 pt-2 lg:hidden">
        {bottomNav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("flex flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium text-slate-500", active && "text-emerald-800")}
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
