"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Check, Home, KeyRound, LoaderCircle, Users } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { createHome, joinHome, type ActionResult } from "./actions";

const routines = ["Limpeza", "Mercado", "Organização", "Pets", "Financeiro", "Manutenção"];

export function OnboardingForm({ initialName }: { initialName: string }) {
  const [mode, setMode] = useState<"create" | "join">("create");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => setResult(await (mode === "create" ? createHome(formData) : joinHome(formData))));
  }

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-8 dark:bg-neutral-950">
      <section className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <BrandLogo size={48} />
          <div><h1 className="text-2xl font-semibold">Configure sua casa</h1><p className="text-sm text-slate-500 dark:text-neutral-400">Crie um espaço ou use o convite recebido.</p></div>
        </div>
        <div className="mt-7 grid grid-cols-2 rounded-lg bg-slate-100 p-1 dark:bg-neutral-800" role="tablist" aria-label="Modo de entrada">
          <button type="button" role="tab" aria-selected={mode === "create"} onClick={() => setMode("create")} className={`flex h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold ${mode === "create" ? "bg-white text-emerald-800 shadow-sm dark:bg-neutral-950 dark:text-emerald-300" : "text-slate-500 dark:text-neutral-400"}`}><Home size={17} />Criar casa</button>
          <button type="button" role="tab" aria-selected={mode === "join"} onClick={() => setMode("join")} className={`flex h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold ${mode === "join" ? "bg-white text-emerald-800 shadow-sm dark:bg-neutral-950 dark:text-emerald-300" : "text-slate-500 dark:text-neutral-400"}`}><KeyRound size={17} />Usar convite</button>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="displayName" label="Seu nome" defaultValue={initialName} required />
            {mode === "create" ? <Field name="homeName" label="Nome da casa" placeholder="Nosso cantinho" required /> : <Field name="code" label="Código do convite" placeholder="ABC123DEF4" required />}
          </div>
          {mode === "create" ? (
            <fieldset><legend className="flex items-center gap-2 font-semibold"><Users size={18} className="text-emerald-700 dark:text-emerald-400" />Rotinas iniciais</legend><div className="mt-3 grid gap-2 sm:grid-cols-3">{routines.map((routine) => <label key={routine} className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm dark:border-neutral-700"><input type="checkbox" name="routines" value={routine} className="size-4 accent-emerald-700" />{routine}</label>)}</div></fieldset>
          ) : <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">O convite precisa ter sido criado para o mesmo e-mail usado no seu cadastro.</p>}
          {result ? <p role={result.ok ? "status" : "alert"} className={`rounded-md px-3 py-2 text-sm ${result.ok ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"}`}>{result.message}</p> : null}
          <button disabled={pending} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 sm:w-auto sm:px-6">{pending ? <LoaderCircle className="animate-spin" size={18} /> : <Check size={18} />}{pending ? "Configurando..." : mode === "create" ? "Criar minha casa" : "Entrar na casa"}</button>
        </form>
      </section>
    </main>
  );
}

function Field({ name, label, placeholder, defaultValue, required }: { name: string; label: string; placeholder?: string; defaultValue?: string; required?: boolean }) {
  return <label className="block text-sm font-medium">{label}<input name={name} placeholder={placeholder} defaultValue={defaultValue} required={required} className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-neutral-700 dark:bg-neutral-950" /></label>;
}
