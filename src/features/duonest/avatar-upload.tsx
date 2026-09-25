"use client";

import { useRef, useState } from "react";
import { Camera, LoaderCircle, Palette } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/browser";
import type { AvatarConfig } from "@/lib/duonest/types";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const defaultConfig: AvatarConfig = {
  presentation: "masculine",
  skin: "medium",
  hair: "short",
  hairColor: "brown",
  shirtColor: "emerald",
};

export function AvatarUpload({
  userId,
  name,
  avatarUrl,
  avatarConfig,
}: {
  userId: string;
  name: string;
  avatarUrl: string | null;
  avatarConfig: AvatarConfig | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState(avatarUrl);
  const [config, setConfig] = useState<AvatarConfig>(
    avatarConfig ?? defaultConfig,
  );
  const [useIllustration, setUseIllustration] = useState(Boolean(avatarConfig));
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
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, {
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
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl, avatar_config: null })
      .eq("id", userId);
    if (profileError) {
      setMessage("A foto foi enviada, mas o perfil não foi atualizado.");
    } else {
      setPreview(publicUrl);
      setUseIllustration(false);
      setMessage("Foto atualizada.");
      router.refresh();
    }
    setPending(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function saveIllustration() {
    setPending(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: null, avatar_config: config })
      .eq("id", userId);
    if (error) setMessage("Não foi possível salvar o avatar.");
    else {
      setPreview(null);
      setUseIllustration(true);
      setMessage("Avatar atualizado.");
      router.refresh();
    }
    setPending(false);
  }

  return (
    <div>
      <div className="flex items-end gap-3">
        <Avatar
          name={name}
          src={preview}
          config={useIllustration ? config : null}
          size={80}
        />
        <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
          {pending ? (
            <LoaderCircle className="animate-spin" size={17} />
          ) : (
            <Camera size={17} />
          )}
          {pending ? "Enviando" : "Trocar foto"}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={pending}
            onChange={(event) => upload(event.target.files?.[0])}
          />
        </label>
      </div>
      <div className="mt-4 border-t border-slate-200 pt-4 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <Palette size={17} className="text-emerald-700" />
          <h3 className="text-sm font-semibold">Criar avatar</h3>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AvatarSelect
            label="Estilo"
            value={config.presentation}
            options={[
              ["masculine", "Masculino"],
              ["feminine", "Feminino"],
            ]}
            onChange={(value) =>
              setConfig({
                ...config,
                presentation: value as AvatarConfig["presentation"],
              })
            }
          />
          <AvatarSelect
            label="Tom de pele"
            value={config.skin}
            options={[
              ["light", "Claro"],
              ["medium", "Médio"],
              ["deep", "Escuro"],
              ["dark", "Profundo"],
            ]}
            onChange={(value) =>
              setConfig({ ...config, skin: value as AvatarConfig["skin"] })
            }
          />
          <AvatarSelect
            label="Cabelo"
            value={config.hair}
            options={[
              ["short", "Curto"],
              ["curly", "Cacheado"],
              ["long", "Longo"],
              ["bun", "Coque"],
            ]}
            onChange={(value) =>
              setConfig({ ...config, hair: value as AvatarConfig["hair"] })
            }
          />
          <AvatarSelect
            label="Cor do cabelo"
            value={config.hairColor}
            options={[
              ["black", "Preto"],
              ["brown", "Castanho"],
              ["blonde", "Loiro"],
              ["red", "Ruivo"],
            ]}
            onChange={(value) =>
              setConfig({
                ...config,
                hairColor: value as AvatarConfig["hairColor"],
              })
            }
          />
          <AvatarSelect
            label="Roupa"
            value={config.shirtColor}
            options={[
              ["emerald", "Verde"],
              ["blue", "Azul"],
              ["coral", "Coral"],
              ["violet", "Violeta"],
            ]}
            onChange={(value) =>
              setConfig({
                ...config,
                shirtColor: value as AvatarConfig["shirtColor"],
              })
            }
          />
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={saveIllustration}
          className="mt-3 flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          <Palette size={17} />
          Usar este avatar
        </button>
      </div>
      {message ? (
        <p
          role="status"
          className="mt-2 text-xs text-slate-500 dark:text-neutral-400"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

function AvatarSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[][];
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs font-medium text-slate-600 dark:text-neutral-300">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
