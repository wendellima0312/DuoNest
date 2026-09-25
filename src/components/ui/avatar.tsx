import Image from "next/image";
import { cn } from "@/lib/utils";
import type { AvatarConfig } from "@/lib/duonest/types";

const skinColors = {
  light: "#f7d6bf",
  medium: "#d99b73",
  deep: "#a96543",
  dark: "#633c2d",
};
const hairColors = {
  black: "#171717",
  brown: "#5b3727",
  blonde: "#d8a73b",
  red: "#9f3f2d",
};
const shirtColors = {
  emerald: "#047857",
  blue: "#2563eb",
  coral: "#e85d4a",
  violet: "#7c3aed",
};

export function Avatar({
  name,
  src,
  config,
  size = 32,
  className,
}: {
  name: string;
  src?: string | null;
  config?: AvatarConfig | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-emerald-100 font-semibold text-emerald-800 ring-1 ring-black/5 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-white/10",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, Math.round(size * 0.34)),
      }}
      aria-label={src || config ? `Avatar de ${name}` : `Sem foto: ${name}`}
    >
      {config ? (
        <AvatarArt config={config} />
      ) : src ? (
        <Image
          src={src}
          alt={`Foto de ${name}`}
          width={size}
          height={size}
          className="size-full object-cover"
        />
      ) : (
        name.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}

function AvatarArt({ config }: { config: AvatarConfig }) {
  const longHair = config.hair === "long" || config.hair === "bun";
  return (
    <span className="relative block size-full overflow-hidden bg-sky-100 dark:bg-sky-950">
      {longHair ? (
        <span
          className="absolute left-[18%] top-[19%] h-[58%] w-[64%] rounded-t-full"
          style={{ backgroundColor: hairColors[config.hairColor] }}
        />
      ) : null}
      {config.hair === "bun" ? (
        <span
          className="absolute left-[39%] top-[7%] size-[25%] rounded-full"
          style={{ backgroundColor: hairColors[config.hairColor] }}
        />
      ) : null}
      <span
        className="absolute left-[22%] top-[22%] h-[51%] w-[56%] rounded-[44%]"
        style={{ backgroundColor: skinColors[config.skin] }}
      >
        <span className="absolute left-[22%] top-[42%] size-[8%] rounded-full bg-neutral-900" />
        <span className="absolute right-[22%] top-[42%] size-[8%] rounded-full bg-neutral-900" />
        <span className="absolute bottom-[18%] left-[36%] h-[5%] w-[28%] rounded-full bg-rose-700/70" />
      </span>
      <span
        className={cn(
          "absolute left-[19%] top-[14%] h-[28%] w-[62%] rounded-t-full",
          config.hair === "curly" && "rounded-[45%]",
        )}
        style={{ backgroundColor: hairColors[config.hairColor] }}
      />
      {config.hair === "short" ? (
        <span
          className="absolute left-[19%] top-[31%] h-[11%] w-[17%] rounded-bl-full"
          style={{ backgroundColor: hairColors[config.hairColor] }}
        />
      ) : null}
      <span
        className="absolute -bottom-[18%] left-[8%] h-[45%] w-[84%] rounded-t-full"
        style={{ backgroundColor: shirtColors[config.shirtColor] }}
      />
      {config.presentation === "feminine" ? (
        <>
          <span className="absolute bottom-[37%] left-[13%] size-[7%] rounded-full bg-amber-300" />
          <span className="absolute bottom-[37%] right-[13%] size-[7%] rounded-full bg-amber-300" />
        </>
      ) : null}
    </span>
  );
}
