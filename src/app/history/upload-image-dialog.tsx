"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

import {
  getCroppedFile,
  getCroppedFileName,
  getOptimizedFullImageFile,
  ImageUploadButton,
  type SelectedFile,
} from "@/components/image-upload-button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useUploadThing } from "@/components/uploadthing";
import { api } from "@/trpc/react";
import { useMediaQuery } from "@uidotdev/usehooks";
import { Camera, Loader2 } from "lucide-react";
import { useState, type Dispatch, type SetStateAction } from "react";
import type { Area } from "react-easy-crop";
import type { MatchImage } from "./match-gallery";

function UploadDialog({
  matchId,
  images,
  setImages,
  close,
}: {
  matchId: number;
  images?: { croppedImage: MatchImage; image: MatchImage };
  setImages: Dispatch<
    SetStateAction<{ croppedImage: MatchImage; image: MatchImage }>
  >;
  close?: () => void;
}) {
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [preparingImage, setPreparingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const setImageMutation = api.match.setImage.useMutation({
    onSuccess: (res) => {
      setImages((prev) => ({
        croppedImage: res.croppedImage,
        image: res.image ?? prev.image,
      }));
      toast.success("Se estableció la imagen");
      close?.();
    },
    onError: (error) => {
      toast.error(error?.message ?? "No se pudo pa");
    },
  });

  const { startUpload, routeConfig, isUploading } = useUploadThing(
    "imageUploader",
    {
      uploadProgressGranularity: "fine",
      onUploadBegin: () => {
        setUploadProgress(0);
      },
      onUploadProgress: (progress) => {
        setUploadProgress(progress);
      },
      onUploadError: (error) => {
        toast.error(error?.message ?? "No se pudo crack.");
      },
    },
  );

  const persistUploads = async (
    files?: {
      url: string;
      key: string;
    }[],
  ) => {
    if (!files || files.length === 0) {
      return;
    }

    const croppedImage = files.at(0);
    const image = files.at(1);

    if (!croppedImage) {
      return;
    }

    try {
      await setImageMutation.mutateAsync({
        matchId,
        image: image
          ? {
              key: image.key,
              url: image.url,
            }
          : undefined,
        croppedImage: {
          key: croppedImage.key,
          url: croppedImage.url,
        },
      });
    } catch {
      // Handled by onError above.
    }
  };
  const someImage = selectedFile?.url ?? images?.image?.url;

  const handleConfirm = async () => {
    if (!croppedArea || !someImage) return;
    try {
      setPreparingImage(true);
      setUploadProgress(0);
      const croppedFile = await getCroppedFile({
        imageSrc: someImage,
        pixelCrop: croppedArea,
        fileName: getCroppedFileName(
          selectedFile?.file.name ?? `match-${matchId}`,
        ),
      });
      const optimizedFullFile = selectedFile?.file
        ? await getOptimizedFullImageFile({ file: selectedFile.file })
        : undefined;
      setPreparingImage(false);
      const files = await startUpload(
        [croppedFile, optimizedFullFile].filter(Boolean) as File[],
      );
      if (files) {
        await persistUploads(
          files.map((f) => ({
            url: f.ufsUrl ?? f.url,
            key: f.key,
          })),
        );
      }
    } catch (error) {
      console.error(error);
      setPreparingImage(false);
    }
  };

  const isLoading = preparingImage || isUploading || setImageMutation.isPending;
  const statusLabel = preparingImage
    ? "Preparando imagen"
    : isUploading
      ? `Subiendo ${uploadProgress}%`
      : setImageMutation.isPending
        ? "Guardando"
        : "Guardar";

  return (
    <div className="flex flex-col gap-2">
      <ImageUploadButton
        disabled={isLoading}
        actualImageSrc={images?.image?.url}
        onFileSelected={setSelectedFile}
        onCroppedAreaChange={setCroppedArea}
        routeConfig={routeConfig}
      />
      <Button
        type="button"
        size="lg"
        className="pointer-events-auto"
        onClick={handleConfirm}
        disabled={isLoading || !croppedArea || !someImage}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            {statusLabel}
          </>
        ) : (
          statusLabel
        )}
      </Button>
    </div>
  );
}

export default function UploadImageDialog(props: {
  matchId: number;
  images?: { croppedImage: MatchImage; image: MatchImage };
  setImages: Dispatch<
    SetStateAction<{ croppedImage: MatchImage; image: MatchImage }>
  >;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);

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
            <DialogTitle>Establecer imagen</DialogTitle>
            <DialogDescription>
              Podés establecer una imagen del duelo
            </DialogDescription>
          </DialogHeader>
          <UploadDialog {...props} close={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Drawer handleOnly open={open} onOpenChange={setOpen}>
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
          <DrawerTitle>Establecer imagen</DrawerTitle>
          <DrawerDescription>
            Podés establecer una imagen del duelo
          </DrawerDescription>
        </DrawerHeader>
        <UploadDialog {...props} close={() => setOpen(false)} />
      </DrawerContent>
    </Drawer>
  );
}
