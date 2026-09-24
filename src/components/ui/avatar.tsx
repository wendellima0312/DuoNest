import Image from "next/image";
import { cn } from "@/lib/utils";

export function Avatar({ name, src, size = 32, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  return (
    <span
      className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-emerald-100 font-semibold text-emerald-800 ring-1 ring-black/5 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-white/10", className)}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.34)) }}
      aria-label={src ? undefined : `Sem foto: ${name}`}
    >
      {src ? <Image src={src} alt={`Foto de ${name}`} width={size} height={size} className="size-full object-cover" /> : name.slice(0, 2).toUpperCase()}
    </span>
  );
}
