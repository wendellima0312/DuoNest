import Link from "next/link";
import { Home, Mail } from "lucide-react";

export default function RecoverPasswordPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f4ef] px-4 py-8">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <Link href="/login" className="mb-8 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-emerald-700 text-white">
            <Home size={20} />
          </div>
          <span className="font-semibold">DuoNest</span>
        </Link>
        <Mail className="mb-3 text-emerald-700" size={24} />
        <h1 className="text-2xl font-semibold">Recuperar senha</h1>
        <p className="mt-2 text-sm text-slate-500">Informe seu e-mail para receber o fluxo de recuperacao do Supabase Auth.</p>
        <form className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            E-mail
            <input type="email" className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-emerald-600" />
          </label>
          <button className="h-11 w-full rounded-lg bg-emerald-700 font-semibold text-white hover:bg-emerald-800" type="button">
            Enviar instrucao
          </button>
        </form>
      </section>
    </main>
  );
}
