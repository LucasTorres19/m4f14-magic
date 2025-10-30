"use client";

import type { inferRouterOutputs } from "@trpc/server";
import { ImageOff } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { MAX_MATCH_IMAGES } from "@/lib/constants";
import type { AppRouter } from "@/server/api/root";
import UploadImageDialog from "./upload-image-dialog";

type MatchesOutput = inferRouterOutputs<AppRouter>["matches"]["findAll"];
export type MatchImage = MatchesOutput[number]["images"][number];

type MatchGalleryProps = {
  matchId: number;
  initialImages: MatchImage[];
};

export function MatchGallery({ matchId, initialImages }: MatchGalleryProps) {
  const [images, setImages] = useState<MatchImage[]>(() =>
    [...initialImages].sort((a, b) => a.order - b.order),
  );

  const remainingSlots = Math.max(0, MAX_MATCH_IMAGES - images.length);

  const hasImages = images.length > 0;
  const primary = hasImages ? images[0] : null;
  const secondary = hasImages ? images.slice(1) : [];

  return (
    <div className="space-y-4">
      {hasImages ? (
        <div className="space-y-3">
          {primary && (
            <div className="relative h-56 overflow-hidden rounded-2xl border border-white/12 bg-background/60 shadow-lg sm:h-72">
              <Image
                src={primary.url}
                alt={
                  primary.name
                    ? `Foto principal: ${primary.name}`
                    : `Foto del duelo ${matchId}`
                }
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 480px, 100vw"
                unoptimized
              />
              <div className="absolute inset-0 bg-linear-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-start gap-3 px-4 py-3 text-xs uppercase tracking-[0.3em] text-white/80">
                <span>Registro visual</span>
              </div>
              <div className="absolute top-4 right-4">
                <UploadImageDialog
                  matchId={matchId}
                  setImages={setImages}
                  remainingSlots={remainingSlots}
                />
              </div>
            </div>
          )}

          {secondary.length > 0 ? (
            <div className="-mx-1 flex items-center gap-3 overflow-x-auto pb-2">
              {secondary.map((image) => (
                <div
                  key={image.id}
                  className="relative h-20 w-32 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-background/70"
                >
                  <Image
                    src={image.url}
                    alt={
                      image.name
                        ? `Foto adicional: ${image.name}`
                        : `Foto adicional del duelo ${matchId}`
                    }
                    fill
                    className="object-cover"
                    sizes="128px"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex relative h-full min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-background/60 p-4 text-center text-sm text-muted-foreground">
          <div className="absolute top-4 right-4">
            <UploadImageDialog
              matchId={matchId}
              setImages={setImages}
              remainingSlots={remainingSlots}
            />
          </div>
          <ImageOff className="size-8 text-muted-foreground/70" />
          <p>Aun no se cargaron fotografias para este duelo.</p>
        </div>
      )}
    </div>
  );
}
