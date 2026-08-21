import { getInvokerInitials } from "@/lib/invoker-profile";
import { cn } from "@/lib/utils";
import Image from "next/image";

const avatarSizes = {
  card: {
    container: "size-12 text-sm",
    imageSizes: "48px",
  },
  profile: {
    container: "size-24 text-2xl md:size-32 md:text-4xl",
    imageSizes: "(min-width: 768px) 128px, 96px",
  },
} as const;

export function InvokerAvatar({
  name,
  imageUrl,
  backgroundColor,
  size = "card",
  className,
}: {
  name: string | null | undefined;
  imageUrl?: string | null;
  backgroundColor?: string | null;
  size?: keyof typeof avatarSizes;
  className?: string;
}) {
  const dimensions = avatarSizes[size];
  const trimmedName = name?.trim();
  const displayName = trimmedName?.length ? trimmedName : "Invocador";

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden rounded-full bg-muted font-bold text-white shadow-sm ring-1 ring-black/10 dark:ring-white/15",
        dimensions.container,
        className,
      )}
      style={
        imageUrl ? undefined : { backgroundColor: backgroundColor ?? "#64748b" }
      }
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={`Foto de ${displayName}`}
          fill
          sizes={dimensions.imageSizes}
          className="object-cover"
        />
      ) : (
        <>
          <span className="absolute inset-0 bg-black/20" aria-hidden />
          <span
            className="relative m-auto leading-none"
            aria-label={displayName}
          >
            {getInvokerInitials(displayName)}
          </span>
        </>
      )}
    </span>
  );
}
