import Link from "next/link";
import { Home, UserPlus } from "lucide-react";

export default function SignupPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f4ef] px-4 py-8">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <Link href="/dashboard" className="mb-8 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-emerald-700 text-white">
            <Home size={20} />
          </div>
          <div>
            <p className="text-lg font-semibold">DuoNest</p>
            <p className="text-xs text-slate-500">Crie sua conta individual</p>
          </div>
        </Link>
        <UserPlus className="mb-3 text-emerald-700" size={24} />
        <h1 className="text-2xl font-semibold">Cadastro</h1>
        <p className="mt-2 text-sm text-slate-500">Depois do cadastro, o onboarding cria uma casa ou aceita convite.</p>
        <form className="mt-6 space-y-4">
          {["Nome", "E-mail", "Senha"].map((field) => (
            <label key={field} className="block text-sm font-medium">
              {field}
              <input
                type={field === "Senha" ? "password" : field === "E-mail" ? "email" : "text"}
                className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-emerald-600"
              />
            </label>
          ))}
          <button className="h-11 w-full rounded-lg bg-emerald-700 font-semibold text-white hover:bg-emerald-800" type="button">
            Criar conta
          </button>
        </form>
      </section>
    </main>
  );
}
