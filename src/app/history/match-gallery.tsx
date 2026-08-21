"use client";

import { ImageOff, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";
import type { MatchSummary } from "./history-types";
import UploadImageDialog from "./upload-image-dialog";

export type MatchImage = MatchSummary["image"];

type MatchGalleryProps = {
  matchId: number;
  image: MatchImage;
  croppedImage: MatchImage;
};

export function MatchGallery({
  matchId,
  image: initialImage,
  croppedImage: initialCroppedImage,
}: MatchGalleryProps) {
  const [images, setImages] = useState({
    croppedImage: initialCroppedImage,
    image: initialImage,
  });

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPreviewSrc, setLightboxPreviewSrc] = useState<string | null>(
    null,
  );
  const [fullImageLoaded, setFullImageLoaded] = useState(false);
  const [fullImagePreloadRequested, setFullImagePreloadRequested] =
    useState(false);
  const [mounted, setMounted] = useState(false);

  const previewUrl = images.croppedImage?.url ?? images.image?.url ?? null;
  const fullUrl = images.image?.url ?? previewUrl;
  const hasSeparateFullImage = Boolean(
    images.image?.url && images.image.url !== previewUrl,
  );
  const fullscreenPreviewSrc = lightboxPreviewSrc ?? previewUrl ?? fullUrl;
  const showFullImage = Boolean(
    fullUrl && (!hasSeparateFullImage || fullImageLoaded),
  );

  const preloadFullImage = useCallback(() => {
    if (!hasSeparateFullImage || !fullUrl || fullImagePreloadRequested) return;
    setFullImagePreloadRequested(true);
  }, [fullImagePreloadRequested, fullUrl, hasSeparateFullImage]);

  const openLightbox = (event: MouseEvent<HTMLDivElement>) => {
    const thumbnail = event.currentTarget.querySelector("img");
    const thumbnailSrc = thumbnail?.currentSrc ?? thumbnail?.src;
    setLightboxPreviewSrc(thumbnailSrc ?? previewUrl);
    setLightboxOpen(true);
  };

  useEffect(() => {
    setFullImagePreloadRequested(false);
    setFullImageLoaded(!hasSeparateFullImage);
  }, [fullUrl, hasSeparateFullImage]);

  useEffect(() => {
    setMounted(true);
    if (!lightboxOpen) return;
    preloadFullImage();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasSeparateFullImage, lightboxOpen, preloadFullImage]);

  const altText = `Landscape image for ${matchId}`;

  return (
    <div className="space-y-4">
      {images.croppedImage ? (
        <AspectRatio
          ratio={16 / 9}
          className={cn(
            "relative rounded-2xl border border-white/12 bg-background/60 shadow-lg",
            images.image && "cursor-zoom-in",
          )}
          onClick={openLightbox}
          onFocus={preloadFullImage}
          onMouseEnter={preloadFullImage}
          onTouchStart={preloadFullImage}
        >
          <Image
            src={images.croppedImage.url}
            alt={altText}
            fill
            className="object-cover object-top rounded-2xl"
            sizes="(min-width: 1024px) 960px, 100vw"
          />
          <div className="absolute inset-0 bg-linear-to-t from-slate-950/80 via-slate-950/20 to-transparent rounded-2xl" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-start gap-3 px-4 py-3 text-xs uppercase tracking-[0.3em] text-white/80">
            <span>Campeones</span>
          </div>
          <div
            className="absolute top-4 right-4"
            onClick={(e) => e.stopPropagation()}
          >
            <UploadImageDialog
              images={images}
              matchId={matchId}
              setImages={setImages}
            />
          </div>
          {fullUrl && hasSeparateFullImage && fullImagePreloadRequested ? (
            <Image
              src={fullUrl}
              alt=""
              aria-hidden="true"
              width={1920}
              height={1080}
              sizes="100vw"
              className="pointer-events-none absolute size-px opacity-0"
            />
          ) : null}
        </AspectRatio>
      ) : (
        <div className="flex relative h-full min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-background/60 p-4 text-center text-sm text-muted-foreground">
          <div className="absolute top-4 right-4">
            <UploadImageDialog matchId={matchId} setImages={setImages} />
          </div>
          <ImageOff className="size-8 text-muted-foreground/70" />
          <p>Aun no se cargaron fotografias para este duelo.</p>
        </div>
      )}

      {mounted &&
        lightboxOpen &&
        fullscreenPreviewSrc &&
        createPortal(
          <div
            className="fixed inset-0 z-9999 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setLightboxOpen(false)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="relative w-[95vw] h-[90vh] max-w-[95vw] max-h-[90vh] rounded-xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={cn(
                  "absolute inset-0 bg-contain bg-center bg-no-repeat transition-opacity duration-200",
                  showFullImage && hasSeparateFullImage
                    ? "opacity-0"
                    : "opacity-100",
                )}
                style={{
                  backgroundImage: fullscreenPreviewSrc
                    ? `url("${fullscreenPreviewSrc}")`
                    : undefined,
                }}
                aria-hidden="true"
              />
              {fullUrl && hasSeparateFullImage ? (
                <Image
                  src={fullUrl}
                  alt={`Imagen completa del match: ${matchId}`}
                  fill
                  className={cn(
                    "object-contain transition-opacity duration-200",
                    showFullImage ? "opacity-100" : "opacity-0",
                  )}
                  sizes="100vw"
                  priority
                  onLoad={() => setFullImageLoaded(true)}
                />
              ) : null}
              {hasSeparateFullImage && !fullImageLoaded ? (
                <div className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-background/90 px-3 py-2 text-xs text-foreground shadow">
                  <Loader2 className="size-3 animate-spin" />
                  Cargando alta calidad
                </div>
              ) : null}
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
