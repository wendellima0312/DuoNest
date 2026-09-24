import Link from "next/link";
import { Check, Home, Users } from "lucide-react";

const routines = ["Limpeza", "Mercado", "Organizacao", "Pets", "Financeiro", "Manutencao"];

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-[#f6f4ef] px-4 py-8">
      <section className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-emerald-700 text-white">
            <Home size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Bem-vindo ao DuoNest.</h1>
            <p className="text-sm text-slate-500">Configure sua casa em poucos passos.</p>
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <label className="block text-sm font-medium">
            Como devemos chamar voce?
            <input className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-emerald-600" placeholder="Wendel" />
          </label>
          <label className="block text-sm font-medium">
            Nome da casa
            <input className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-emerald-600" placeholder="Nosso Cantinho" />
          </label>
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-emerald-700" />
            <h2 className="font-semibold">Voce mora com alguem?</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-left font-medium text-emerald-900" type="button">
              Convidar parceiro(a)
            </button>
            <button className="rounded-lg border border-slate-200 px-4 py-3 text-left font-medium" type="button">
              Continuar sozinho
            </button>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="font-semibold">Escolha algumas rotinas</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {routines.map((routine) => (
              <label key={routine} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <input type="checkbox" className="size-4 accent-emerald-700" />
                {routine}
              </label>
            ))}
          </div>
        </div>

        <Link href="/dashboard" className="mt-8 inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-700 px-5 font-semibold text-white hover:bg-emerald-800">
          <Check size={18} />
          Tudo pronto
        </Link>
      </section>
    </main>
  );
}
