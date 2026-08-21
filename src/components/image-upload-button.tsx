import { cn } from "@/lib/utils";
import { useMediaQuery } from "@uidotdev/usehooks";
import { useDropzone } from "@uploadthing/react";
import { BookImage, Camera } from "lucide-react";
import createPica from "pica";
import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import Cropper, { type Area, type CropperProps } from "react-easy-crop";
import {
  generateClientDropzoneAccept,
  generatePermittedFileTypes,
} from "uploadthing/client";
import { Button } from "./ui/button";

import type { ExpandedRouteConfig } from "uploadthing/types";

type ImageUploaderProps = {
  actualImageSrc?: string;
  onFileSelected?: (selected: SelectedFile | null) => void;
  onCroppedAreaChange?: (area: Area | null) => void;
  routeConfig?: ExpandedRouteConfig;
  disabled?: boolean;
};

type UploadedImage = {
  key: string;
  url: string;
  name: string | null;
};

const imageResizer = createPica();
export const MATCH_CARD_IMAGE_MAX_WIDTH = 1280;
export const MATCH_CARD_IMAGE_MAX_HEIGHT = 720;
export const MATCH_DISPLAY_IMAGE_MAX_DIMENSION = 1920;

export type SelectedFile = {
  file: File;
  url: string;
};

export function ImageUploadButton({
  actualImageSrc,
  onCroppedAreaChange,
  onFileSelected,
  routeConfig,
  disabled,
}: ImageUploaderProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [uploadedImage, setUploadedImage] = useState<UploadedImage>();
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const setPreviewFile = useCallback((file: File | null) => {
    setSelectedFile((previous) => {
      if (previous?.url) URL.revokeObjectURL(previous.url);
      if (!file) return null;
      return { file, url: URL.createObjectURL(file) };
    });
    setCroppedAreaPixels(null);
    if (file) {
      setUploadedImage(undefined);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (selectedFile?.url) URL.revokeObjectURL(selectedFile.url);
    };
  }, [selectedFile]);

  const onCropComplete = useCallback<
    NonNullable<CropperProps["onCropComplete"]>
  >((_croppedArea, newCroppedAreaPixels) => {
    setCroppedAreaPixels(newCroppedAreaPixels);
  }, []);

  useEffect(() => {
    onCroppedAreaChange?.(croppedAreaPixels);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [croppedAreaPixels]);

  useEffect(() => {
    onFileSelected?.(selectedFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const image = acceptedFiles.at(0);
      if (!image) return;
      setPreviewFile(image);
    },
    [setPreviewFile],
  );

  const { getRootProps, getInputProps, isDragAccept, isDragReject } =
    useDropzone({
      onDrop,
      accept: generateClientDropzoneAccept(
        generatePermittedFileTypes(routeConfig).fileTypes,
      ),
      maxFiles: 1,
      multiple: false,
    });

  const handleCameraCapture = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPreviewFile(file);
    event.target.value = "";
  };

  const srcToShow =
    selectedFile?.url ?? uploadedImage?.url ?? actualImageSrc ?? null;
  const showPreview = !!srcToShow;

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "relative h-auto w-full min-h-[480px] rounded-md border border-dashed border-muted-foreground/40 bg-muted/40",
          isDragReject && "bg-destructive/20 border-destructive/20",
          isDragAccept && "bg-muted/80 border-muted-foreground/80",
          showPreview && "",
        )}
        {...getRootProps()}
        onClick={() => {
          return;
        }}
      >
        {showPreview && (
          <Cropper
            objectFit="horizontal-cover"
            image={srcToShow}
            crop={crop}
            zoom={zoom}
            aspect={16 / 9}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        )}
        <div
          className={cn(
            "absolute flex-col inset-0 gap-2 flex justify-center items-center p-4 pointer-events-none",
            showPreview && "justify-start items-end",
          )}
        >
          {!isDesktop && (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={disabled}
              className="border-primary/40 text-primary hover:border-primary/60 pointer-events-auto w-40"
              asChild
            >
              <label onClick={(e) => e.stopPropagation()}>
                <input
                  {...getInputProps()}
                  disabled={disabled}
                  capture="environment"
                  className="sr-only"
                  onChange={handleCameraCapture}
                />
                <Camera className="size-4" />
                Tomar foto
              </label>
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="lg"
            disabled={disabled}
            className="border-primary/40 text-primary hover:border-primary/60 pointer-events-auto w-40"
            asChild
          >
            <label>
              <input
                {...getInputProps()}
                disabled={disabled}
                className="sr-only"
              />
              <BookImage className="size-4" />
              {isDesktop ? "Buscar imagen" : "Galería"}
            </label>
          </Button>
        </div>
      </div>
    </div>
  );
}

const createImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error()));
    image.crossOrigin = "anonymous";
    image.src = url;
  });

export const getCroppedFileName = (originalName: string) => {
  const extensionIndex = originalName.lastIndexOf(".");
  if (extensionIndex === -1) return `${originalName}-cropped.webp`;
  const baseName = originalName.slice(0, extensionIndex);
  return `${baseName}-cropped.webp`;
};

const getDisplayFileName = (originalName: string) => {
  const extensionIndex = originalName.lastIndexOf(".");
  if (extensionIndex === -1) return `${originalName}-display.webp`;
  const baseName = originalName.slice(0, extensionIndex);
  return `${baseName}-display.webp`;
};

const canvasToFile = async ({
  canvas,
  fileName,
  mimeType,
  quality,
}: {
  canvas: HTMLCanvasElement;
  fileName: string;
  mimeType: string;
  quality: number;
}) => {
  const blob = await imageResizer.toBlob(canvas, mimeType, quality);

  return new File([blob], fileName, { type: blob.type || mimeType });
};

const resizeCanvasToFile = async ({
  source,
  width,
  height,
  fileName,
  mimeType,
  quality,
}: {
  source: HTMLCanvasElement | HTMLImageElement;
  width: number;
  height: number;
  fileName: string;
  mimeType: string;
  quality: number;
}) => {
  const output = document.createElement("canvas");
  output.width = width;
  output.height = height;

  await imageResizer.resize(source, output);

  return canvasToFile({
    canvas: output,
    fileName,
    mimeType,
    quality,
  });
};

export const getCroppedFile = async ({
  imageSrc,
  pixelCrop,
  fileName,
  mimeType = "image/webp",
  quality = 0.86,
  maxWidth = MATCH_CARD_IMAGE_MAX_WIDTH,
  maxHeight = MATCH_CARD_IMAGE_MAX_HEIGHT,
}: {
  imageSrc: string;
  pixelCrop: Area;
  fileName: string;
  mimeType?: string;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}) => {
  const image = await createImage(imageSrc);
  const width = Math.max(Math.round(pixelCrop.width), 1);
  const height = Math.max(Math.round(pixelCrop.height), 1);
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  const outputWidth = Math.max(Math.round(width * scale), 1);
  const outputHeight = Math.max(Math.round(height * scale), 1);

  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = width;
  croppedCanvas.height = height;

  const ctx = croppedCanvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to retrieve canvas context");
  }

  const cropX = Math.round(pixelCrop.x);
  const cropY = Math.round(pixelCrop.y);

  ctx.drawImage(image, cropX, cropY, width, height, 0, 0, width, height);

  return resizeCanvasToFile({
    source: croppedCanvas,
    width: outputWidth,
    height: outputHeight,
    fileName,
    mimeType,
    quality,
  });
};

export const getImageFileMetadata = async (file: File) => {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await createImage(imageUrl);
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      sizeBytes: file.size,
      mimeType: file.type,
    };
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
};

export const getDisplayImageFile = async ({
  file,
  maxDimension = MATCH_DISPLAY_IMAGE_MAX_DIMENSION,
  mimeType = "image/webp",
  quality = 0.9,
}: {
  file: File;
  maxDimension?: number;
  mimeType?: string;
  quality?: number;
}) => {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await createImage(imageUrl);
    const scale = Math.min(
      maxDimension / image.naturalWidth,
      maxDimension / image.naturalHeight,
      1,
    );
    const width = Math.max(Math.round(image.naturalWidth * scale), 1);
    const height = Math.max(Math.round(image.naturalHeight * scale), 1);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    await imageResizer.resize(image, canvas);

    return canvasToFile({
      canvas,
      fileName: getDisplayFileName(file.name),
      mimeType,
      quality,
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
};
