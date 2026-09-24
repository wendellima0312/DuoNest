"use client";

import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("duonest-theme", next ? "dark" : "light");
  }

  return <button type="button" onClick={toggle} className="grid size-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800" aria-label="Alternar tema" title="Alternar tema"><Moon className="dark:hidden" size={18} /><Sun className="hidden dark:block" size={18} /></button>;
}
