export default function Loading() {
  return (
    <div className="animate-pulse space-y-5" aria-label="Carregando conteúdo">
      <div className="space-y-2">
        <div className="h-4 w-32 rounded bg-slate-200 dark:bg-neutral-800" />
        <div className="h-8 w-52 rounded bg-slate-200 dark:bg-neutral-800" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-5">
          <div className="h-52 rounded-lg bg-slate-200 dark:bg-neutral-800" />
          <div className="h-72 rounded-lg bg-slate-200 dark:bg-neutral-800" />
        </div>
        <div className="space-y-5">
          <div className="h-60 rounded-lg bg-slate-200 dark:bg-neutral-800" />
          <div className="h-60 rounded-lg bg-slate-200 dark:bg-neutral-800" />
        </div>
      </div>
    </div>
  );
}
