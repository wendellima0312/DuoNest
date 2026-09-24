"use client";

import { useRef, useState } from "react";
import { Camera, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/browser";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function AvatarUpload({ userId, name, avatarUrl }: { userId: string; name: string; avatarUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState(avatarUrl);
  const [message, setMessage] = useState<string | null>(null);

  async function upload(file?: File) {
    if (!file) return;
    if (!allowedTypes.has(file.type) || file.size > 5 * 1024 * 1024) {
      setMessage("Use uma imagem JPG, PNG ou WebP de até 5 MB.");
      return;
    }

    setPending(true);
    setMessage(null);
    const supabase = createClient();
    const path = `${userId}/avatar`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: true,
    });

    if (uploadError) {
      setMessage("Não foi possível enviar a foto.");
      setPending(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = `${data.publicUrl}?v=${Date.now()}`;
    const { error: profileError } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
    if (profileError) {
      setMessage("A foto foi enviada, mas o perfil não foi atualizado.");
    } else {
      setPreview(publicUrl);
      setMessage("Foto atualizada.");
      router.refresh();
    }
    setPending(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <div className="flex items-end gap-3">
        <Avatar name={name} src={preview} size={80} />
        <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
          {pending ? <LoaderCircle className="animate-spin" size={17} /> : <Camera size={17} />}
          {pending ? "Enviando" : "Trocar foto"}
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={pending} onChange={(event) => upload(event.target.files?.[0])} />
        </label>
      </div>
      {message ? <p role="status" className="mt-2 text-xs text-slate-500 dark:text-neutral-400">{message}</p> : null}
    </div>
  );
}
