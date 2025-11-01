"use client";

import type { inferRouterOutputs } from "@trpc/server";
import { ImageOff, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import type { AppRouter } from "@/server/api/root";
import UploadImageDialog from "./upload-image-dialog";

type MatchesOutput = inferRouterOutputs<AppRouter>["matches"]["findAll"];
export type MatchImage = MatchesOutput[number]["images"][number];

type MatchGalleryProps = {
  matchId: number;
  initialImages: MatchImage[];
};

export function MatchGallery({ matchId, initialImages }: MatchGalleryProps) {
  const [image, setImage] = useState<MatchImage | undefined>(() =>
    [...initialImages].sort((a, b) => a.order - b.order).at(0),
  );

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen]);

  const altText = useMemo(
    () =>
      image?.name
        ? `Foto principal: ${image.name}`
        : `Foto del duelo ${matchId}`,
    [image?.name, matchId],
  );

  return (
    <div className="space-y-4">
      {image ? (
        <AspectRatio
          ratio={16 / 9}
          className="relative rounded-2xl border border-white/12 bg-background/60 shadow-lg cursor-zoom-in"
          onClick={() => setLightboxOpen(true)}
        >
          <Image
            src={image.url}
            alt={altText}
            fill
            className="object-cover object-top rounded-2xl"
            sizes="(min-width: 1024px) 480px, 100vw"
            unoptimized
          />
          <div className="absolute inset-0 bg-linear-to-t from-slate-950/80 via-slate-950/20 to-transparent rounded-2xl" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-start gap-3 px-4 py-3 text-xs uppercase tracking-[0.3em] text-white/80">
            <span>Campeones</span>
          </div>
          <div className="absolute top-4 right-4" onClick={(e) => e.stopPropagation()}>
            <UploadImageDialog
              image={image}
              matchId={matchId}
              setImage={setImage}
            />
          </div>
        </AspectRatio>
      ) : (
        <div className="flex relative h-full min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-background/60 p-4 text-center text-sm text-muted-foreground">
          <div className="absolute top-4 right-4">
            <UploadImageDialog matchId={matchId} setImage={setImage} />
          </div>
          <ImageOff className="size-8 text-muted-foreground/70" />
          <p>Aun no se cargaron fotografias para este duelo.</p>
        </div>
      )}

      {mounted && lightboxOpen && image &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setLightboxOpen(false)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="relative w-[95vw] h-[90vh] max-w-[95vw] max-h-[90vh] rounded-xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={image.url}
                alt={altText}
                fill
                className="object-contain"
                sizes="100vw"
                priority
                unoptimized
              />
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-background/90 px-3 py-2 text-sm shadow hover:bg-background"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
                Cerrar
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
