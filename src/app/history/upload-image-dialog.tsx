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

import { ImageUploadButton } from "@/components/image-upload-button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { api } from "@/trpc/react";
import { useMediaQuery } from "@uidotdev/usehooks";
import { Camera } from "lucide-react";
import { useState, type Dispatch, type SetStateAction } from "react";
import type { MatchImage } from "./match-gallery";

function UploadDialog({
  matchId,
  image,
  setImage,
  close,
}: {
  matchId: number;
  image?: MatchImage;
  setImage: Dispatch<SetStateAction<MatchImage | undefined>>;
  close?: () => void;
}) {
  const setImageMutation = api.match.setImage.useMutation({
    onSuccess: (image) => {
      setImage({
        id: image.id,
        key: image.fileKey,
        name: image.originalName,
        order: image.displayOrder,
        url: image.fileUrl,
      });
      toast.success("Se estableció la imagen");
      close?.();
    },
    onError: (error) => {
      toast.error(error?.message ?? "No se pudo pa");
    },
  });

  const persistUploads = async (
    files?: {
      url: string;
      key: string;
      name?: string | null;
    }[],
  ) => {
    if (!files || files.length === 0) {
      return;
    }

    const image = files.at(0);

    if (!image) {
      return;
    }

    try {
      await setImageMutation.mutateAsync({
        matchId,
        image: {
          key: image.key,
          url: image.url,
        },
      });
    } catch {
      // Handled by onError above.
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

  return (
    <ImageUploadButton
      endpoint="imageUploader"
      onClientUploadComplete={handleUploadComplete}
      onUploadError={(error) => {
        toast.error(error?.message ?? "No se pudo crack.");
      }}
      actualImageSrc={image?.url}
    />
  );
}

export default function UploadImageDialog(props: {
  matchId: number;
  image?: MatchImage;
  setImage: Dispatch<SetStateAction<MatchImage | undefined>>;
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
