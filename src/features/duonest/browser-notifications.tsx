"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

type PermissionState = NotificationPermission | "unsupported";

export function BrowserNotificationListener({ userId }: { userId: string }) {
  const router = useRouter();
  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js");

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        async ({ new: notification }) => {
          router.refresh();
          if (Notification.permission !== "granted") return;
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(String(notification.title ?? "DuoNest"), {
            body: notification.body ? String(notification.body) : undefined,
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            tag: `duonest-${String(notification.id)}`,
            data: { url: "/configuracoes/notificacoes" },
          });
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [router, userId]);

  return null;
}

export function BrowserNotificationControl() {
  const [permission, setPermission] = useState<PermissionState>("default");

  async function enable() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return;
    }
    await navigator.serviceWorker.register("/sw.js");
    setPermission(await Notification.requestPermission());
  }

  const enabled = permission === "granted";
  return <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">{enabled ? <Bell size={19} /> : <BellOff size={19} />}</span><div><h2 className="font-semibold">Avisos do navegador</h2><p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">Receba as ações da casa em tempo real neste dispositivo.</p></div></div><button type="button" onClick={enable} disabled={enabled || permission === "denied" || permission === "unsupported"} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:bg-slate-300 disabled:text-slate-600 dark:disabled:bg-neutral-700 dark:disabled:text-neutral-300">{enabled ? <><Check size={17} />Ativadas</> : permission === "denied" ? "Bloqueadas no navegador" : permission === "unsupported" ? "Não disponível" : "Ativar notificações"}</button></div>;
}
