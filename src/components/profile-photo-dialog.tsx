"use client";

import {
  getCroppedFile,
  getImageFileMetadata,
  ImageUploadButton,
  type SelectedFile,
} from "@/components/image-upload-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useUploadThing } from "@/components/uploadthing";
import { api } from "@/trpc/react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Area } from "react-easy-crop";
import { toast } from "sonner";

const PROFILE_IMAGE_MAX_DIMENSION = 512;

export function ProfilePhotoDialog({
  playerId,
  playerName,
  imageUrl,
  children,
}: {
  playerId: number;
  playerName: string;
  imageUrl?: string | null;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const utils = api.useUtils();

  const authorizeUpload = api.players.authorizeProfileImageUpload.useMutation();
  const setProfileImage = api.players.setProfileImage.useMutation();
  const { startUpload, routeConfig, isUploading } = useUploadThing(
    "profileImageUploader",
    {
      uploadProgressGranularity: "fine",
      onUploadBegin: () => setUploadProgress(0),
      onUploadProgress: setUploadProgress,
      onUploadError: (error) => {
        toast.error(error.message || "No se pudo subir la foto.");
      },
    },
  );

  const refreshPlayer = async () => {
    await Promise.all([
      utils.players.detail.invalidate({ playerId }),
      utils.players.listWithStats.invalidate(),
    ]);
  };

  const close = () => {
    setOpen(false);
    setSelectedFile(null);
    setCroppedArea(null);
    setUploadProgress(0);
  };

  const handleSave = async () => {
    const source = selectedFile?.url ?? imageUrl;
    if (!source || !croppedArea) return;

    try {
      await authorizeUpload.mutateAsync();
      setPreparing(true);
      const file = await getCroppedFile({
        imageSrc: source,
        pixelCrop: croppedArea,
        fileName: `invocador-${playerId}-perfil.webp`,
        maxWidth: PROFILE_IMAGE_MAX_DIMENSION,
        maxHeight: PROFILE_IMAGE_MAX_DIMENSION,
        quality: 0.9,
      });
      const metadata = await getImageFileMetadata(file);
      setPreparing(false);

      const [uploaded] = (await startUpload([file])) ?? [];
      if (!uploaded) return;

      await setProfileImage.mutateAsync({
        playerId,
        image: {
          key: uploaded.key,
          url: uploaded.ufsUrl ?? uploaded.url,
          ...metadata,
        },
      });
      await refreshPlayer();
      toast.success("Foto de perfil actualizada");
      close();
    } catch (error) {
      setPreparing(false);
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la foto.",
      );
    }
  };

  const handleRemove = async () => {
    try {
      await setProfileImage.mutateAsync({ playerId, image: null });
      await refreshPlayer();
      toast.success("Foto de perfil eliminada");
      close();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo eliminar la foto.",
      );
    }
  };

  const isBusy =
    preparing ||
    isUploading ||
    authorizeUpload.isPending ||
    setProfileImage.isPending;
  const status = preparing
    ? "Preparando foto"
    : isUploading
      ? `Subiendo ${uploadProgress}%`
      : setProfileImage.isPending
        ? "Guardando"
        : "Guardar foto";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isBusy) return;
        if (nextOpen) setOpen(true);
        else close();
      }}
    >
      <DialogTrigger asChild>
        {children ?? (
          <Button type="button" size="icon" variant="secondary">
            <Camera className="size-4" />
            <span className="sr-only">Cambiar foto de {playerName}</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Foto de {playerName}</DialogTitle>
          <DialogDescription>
            Elegí una imagen y ajustá el recorte circular. Se guardará
            optimizada para el perfil.
          </DialogDescription>
        </DialogHeader>

        <ImageUploadButton
          actualImageSrc={imageUrl ?? undefined}
          aspect={1}
          cropShape="round"
          objectFit="cover"
          className="min-h-80"
          disabled={isBusy}
          onFileSelected={setSelectedFile}
          onCroppedAreaChange={setCroppedArea}
          routeConfig={routeConfig}
        />

        <DialogFooter className="gap-2 sm:justify-between">
          {imageUrl ? (
            <Button
              type="button"
              variant="destructive"
              onClick={handleRemove}
              disabled={isBusy}
            >
              <Trash2 className="size-4" />
              Eliminar foto
            </Button>
          ) : (
            <span />
          )}
          <Button
            type="button"
            onClick={handleSave}
            disabled={
              isBusy || !croppedArea || !(selectedFile?.url ?? imageUrl)
            }
          >
            {isBusy ? <Loader2 className="size-4 animate-spin" /> : null}
            {status}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
