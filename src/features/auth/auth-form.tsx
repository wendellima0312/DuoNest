"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Home, LoaderCircle, LockKeyhole, Mail, UserPlus } from "lucide-react";
import {
  requestPasswordReset,
  signIn,
  signUp,
  updatePassword,
  type AuthState,
} from "./actions";

type Mode = "login" | "signup" | "recover" | "update";

const initialState: AuthState = {};

export function AuthForm({ mode, next = "/dashboard" }: { mode: Mode; next?: string }) {
  const action = mode === "login" ? signIn : mode === "signup" ? signUp : mode === "recover" ? requestPasswordReset : updatePassword;
  const [state, formAction, pending] = useActionState(action, initialState);
  const title = mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : mode === "recover" ? "Recuperar senha" : "Nova senha";
  const description = mode === "login"
    ? "Acesse a rotina compartilhada da sua casa."
    : mode === "signup"
      ? "Crie seu perfil e depois configure ou entre em uma casa."
      : mode === "recover"
        ? "Enviaremos um link seguro para o seu e-mail."
        : "Escolha uma senha nova para sua conta.";
  const Icon = mode === "signup" ? UserPlus : mode === "recover" ? Mail : LockKeyhole;

  return (
    <main className="grid min-h-screen place-items-center bg-stone-100 px-4 py-8 dark:bg-neutral-950">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <Link href="/" className="mb-8 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-emerald-700 text-white"><Home size={20} /></span>
          <span><strong className="block text-lg">DuoNest</strong><small className="text-slate-500 dark:text-neutral-400">Rotina doméstica compartilhada</small></span>
        </Link>
        <Icon className="mb-3 text-emerald-700 dark:text-emerald-400" size={24} />
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">{description}</p>

        <form action={formAction} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next} />
          {mode === "signup" ? <Field label="Nome" name="displayName" autoComplete="name" placeholder="Como devemos chamar você?" /> : null}
          {mode !== "update" ? <Field label="E-mail" name="email" type="email" autoComplete="email" placeholder="voce@email.com" /> : null}
          {mode === "login" || mode === "signup" || mode === "update" ? (
            <Field label={mode === "update" ? "Nova senha" : "Senha"} name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="Mínimo de 8 caracteres" />
          ) : null}

          {state.error ? <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{state.error}</p> : null}
          {state.success ? <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">{state.success}</p> : null}

          <button disabled={pending} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
            {pending ? <LoaderCircle className="animate-spin" size={18} /> : null}
            {pending ? "Aguarde..." : title}
          </button>
        </form>

        {mode === "login" ? (
          <div className="mt-5 flex items-center justify-between text-sm">
            <Link href="/cadastro" className="font-medium text-emerald-700 dark:text-emerald-400">Criar conta</Link>
            <Link href="/recuperar-senha" className="text-slate-500 dark:text-neutral-400">Esqueci a senha</Link>
          </div>
        ) : null}
        {mode === "signup" || mode === "recover" ? <Link href="/login" className="mt-5 inline-block text-sm font-medium text-emerald-700 dark:text-emerald-400">Voltar para entrar</Link> : null}
        {mode === "update" && state.success ? <Link href="/dashboard" className="mt-5 inline-block text-sm font-medium text-emerald-700 dark:text-emerald-400">Ir para o painel</Link> : null}
      </section>
    </main>
  );
}

function Field({ label, name, type = "text", autoComplete, placeholder }: { label: string; name: string; type?: string; autoComplete?: string; placeholder?: string }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input required name={name} type={type} autoComplete={autoComplete} placeholder={placeholder} className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-neutral-700 dark:bg-neutral-950" />
    </label>
  );
}
