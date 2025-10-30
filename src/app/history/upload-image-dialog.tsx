import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UploadDropzone } from "@/components/uploadthing";
import { toast } from "sonner";

import type { OurFileRouter } from "@/app/api/uploadthing/core";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { MAX_MATCH_IMAGES } from "@/lib/constants";
import { api } from "@/trpc/react";
import { useMediaQuery } from "@uidotdev/usehooks";
import { Camera, Loader2 } from "lucide-react";
import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import { genUploader } from "uploadthing/client";
import type { MatchImage } from "./match-gallery";

function UploadDialog({
  matchId,
  remainingSlots,
  setImages,
  close,
  enableCameraCapture = false,
}: {
  matchId: number;
  remainingSlots: number;
  setImages: Dispatch<SetStateAction<MatchImage[]>>;
  close: () => void;
  enableCameraCapture?: boolean;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const captureInputRef = useRef<HTMLInputElement | null>(null);
  const { uploadFiles } = useMemo(() => genUploader<OurFileRouter>(), []);
  const addImages = api.match.addImages.useMutation({
    onSuccess: (data) => {
      if (!data || data.images.length === 0) {
        return;
      }
      setImages((prev) => {
        const merged = [...prev, ...data.images].sort(
          (a, b) => a.order - b.order,
        );
        if (merged.length >= MAX_MATCH_IMAGES) {
          close();
        }
        return merged;
      });
      toast.success(
        data.images.length === 1
          ? "Se agrego una nueva fotografia."
          : `Se agregaron ${data.images.length} fotografias.`,
      );
    },
    onError: (error) => {
      toast.error(
        error?.message ?? "No se pudieron guardar las fotografias del duelo.",
      );
    },
  });
  if (remainingSlots < 1) return null;

  const persistUploads = async (
    files?: {
      url: string;
      key: string;
      name?: string | null;
    }[],
  ) => {
    if (!files || files.length === 0) {
      setIsUploading(false);
      return;
    }

    if (remainingSlots <= 0) {
      setIsUploading(false);
      toast.error("Este duelo ya tiene la cantidad maxima de imagenes.");
      return;
    }

    const allowedFiles = files.slice(0, remainingSlots);

    if (allowedFiles.length < files.length) {
      toast.info(
        `Solo se cargaron ${allowedFiles.length} imagenes por alcanzar el limite.`,
      );
    }

    if (allowedFiles.length === 0) {
      setIsUploading(false);
      return;
    }

    try {
      await addImages.mutateAsync({
        matchId,
        images: allowedFiles.map((file) => ({
          key: file.key,
          url: file.url,
          name: file.name ?? undefined,
        })),
      });
    } catch {
      // Handled by onError above.
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadComplete = async (
    files?: {
      url: string;
      key: string;
      name?: string | null;
    }[],
  ) => {
    await persistUploads(files);
  };

  const handleCaptureClick = () => {
    if (isUploading || addImages.isPending) return;
    captureInputRef.current?.click();
  };

  const handleCameraCapture = async (event: ChangeEvent<HTMLInputElement>) => {
    const selection = event.target.files;
    if (!selection || selection.length === 0) {
      event.target.value = "";
      return;
    }

    if (remainingSlots <= 0) {
      toast.error("Este duelo ya tiene la cantidad maxima de imagenes.");
      event.target.value = "";
      return;
    }

    const files = Array.from(selection).slice(0, remainingSlots);

    if (files.length < selection.length) {
      toast.info(
        `Solo se cargaron ${files.length} imagenes por alcanzar el limite.`,
      );
    }

    setIsUploading(true);

    try {
      const uploaded = await uploadFiles("imageUploader", {
        files,
      });

      await persistUploads(
        uploaded.map((file) => ({
          key: file.key,
          url: file.url,
          name: file.name ?? null,
        })),
      );
    } catch {
      setIsUploading(false);
      toast.error("No se pudo capturar la imagen. Intenta nuevamente.");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <>
      {false}
      {enableCameraCapture ? (
        <div className="mb-3 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-3">
          <input
            ref={captureInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleCameraCapture}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-primary/40 text-primary hover:border-primary/60"
            onClick={handleCaptureClick}
            disabled={isUploading || addImages.isPending}
          >
            <Camera className="mr-2 size-4" />
            Tomar foto ahora
          </Button>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Abre la camara de tu dispositivo para capturar una imagen al
            instante.
          </p>
        </div>
      ) : null}
      <UploadDropzone
        endpoint="imageUploader"
        onUploadBegin={() => {
          setIsUploading(true);
        }}
        onClientUploadComplete={handleUploadComplete}
        onUploadError={(error) => {
          setIsUploading(false);
          toast.error(error?.message ?? "No se pudieron subir las imagenes.");
        }}
        appearance={{
          label: "text-sm font-medium text-foreground",
          button: "bg-primary text-primary-foreground hover:bg-primary/90",
          allowedContent: "text-xs text-muted-foreground",
        }}
        className="ut-uploadthing h-auto min-h-40 rounded-md border border-dashed border-muted-foreground/40 bg-muted/40"
      />
      {isUploading || addImages.isPending ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground/80">
          <Loader2 className="size-4 animate-spin" />
          {isUploading ? "Subiendo imagenes..." : "Guardando imagenes..."}
        </p>
      ) : null}
    </>
  );
}

export default function UploadImageDialog(props: {
  matchId: number;
  remainingSlots: number;
  setImages: Dispatch<SetStateAction<MatchImage[]>>;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);

  if (props.remainingSlots < 1) return null;

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-primary/40 text-primary hover:border-primary/60 cursor-pointer dark:bg-slate-900/70 dark:hover:bg-slate-900/90"
          >
            <Camera className="size-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevas fotos</DialogTitle>
            <DialogDescription>
              Podés subir {props.remainingSlots}{" "}
              {props.remainingSlots === 1 ? "imagen más" : "imagenes más"}.
            </DialogDescription>
          </DialogHeader>
          <UploadDialog {...props} close={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-primary/40 text-primary hover:border-primary/60 cursor-pointer dark:bg-slate-900/70 dark:hover:bg-slate-900/90"
        >
          <Camera className="size-4" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Nuevas fotos</DrawerTitle>
          <DrawerDescription>
            Podés subir {props.remainingSlots}{" "}
            {props.remainingSlots === 1 ? "imagen más" : "imagenes más"}.
          </DrawerDescription>
        </DrawerHeader>
        <UploadDialog
          {...props}
          close={() => setOpen(false)}
          enableCameraCapture
        />
      </DrawerContent>
    </Drawer>
  );
}
