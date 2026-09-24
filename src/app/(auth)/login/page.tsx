import Link from "next/link";
import { Home, LockKeyhole } from "lucide-react";

export default function LoginPage() {
  return <AuthPage mode="login" />;
}

function AuthPage({ mode }: { mode: "login" | "cadastro" | "recuperar" }) {
  const isLogin = mode === "login";

  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f4ef] px-4 py-8">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <Link href="/dashboard" className="mb-8 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-emerald-700 text-white">
            <Home size={20} />
          </div>
          <div>
            <p className="text-lg font-semibold">DuoNest</p>
            <p className="text-xs text-slate-500">Rotina domestica compartilhada</p>
          </div>
        </Link>

        <div className="mb-6">
          <LockKeyhole className="mb-3 text-emerald-700" size={24} />
          <h1 className="text-2xl font-semibold">{isLogin ? "Entrar" : "Criar conta"}</h1>
          <p className="mt-2 text-sm text-slate-500">Autenticacao preparada para Supabase Auth com e-mail, senha e verificacao.</p>
        </div>

        <form className="space-y-4">
          {!isLogin ? (
            <label className="block text-sm font-medium">
              Nome
              <input className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-emerald-600" placeholder="Como devemos chamar voce?" />
            </label>
          ) : null}
          <label className="block text-sm font-medium">
            E-mail
            <input type="email" className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-emerald-600" placeholder="voce@email.com" />
          </label>
          <label className="block text-sm font-medium">
            Senha
            <input type="password" className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-emerald-600" placeholder="Sua senha" />
          </label>
          <button className="h-11 w-full rounded-lg bg-emerald-700 font-semibold text-white hover:bg-emerald-800" type="button">
            {isLogin ? "Entrar" : "Cadastrar"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm">
          <Link href={isLogin ? "/cadastro" : "/login"} className="font-medium text-emerald-800">
            {isLogin ? "Criar conta" : "Ja tenho conta"}
          </Link>
          <Link href="/recuperar-senha" className="text-slate-500">
            Recuperar senha
          </Link>
        </div>
      </section>
    </main>
  );
}
