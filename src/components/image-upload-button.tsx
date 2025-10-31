import { cn } from "@/lib/utils";
import { useMediaQuery } from "@uidotdev/usehooks";
import { useDropzone } from "@uploadthing/react";
import { BookImage, Camera, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import Cropper, { type Area, type CropperProps } from "react-easy-crop";
import {
  generateClientDropzoneAccept,
  generatePermittedFileTypes,
} from "uploadthing/client";
import { Button } from "./ui/button";
import { useUploadThing } from "./uploadthing";
type UseUploadThingParameters = Parameters<typeof useUploadThing>;
type ImageUploaderProps = {
  actualImageSrc?: string;
  endpoint: UseUploadThingParameters[0];
} & UseUploadThingParameters[1];

type UploadedImage = {
  key: string;
  url: string;
  name: string | null;
};

type SelectedFile = {
  file: File;
  url: string;
};

export function ImageUploadButton({
  endpoint,
  actualImageSrc,
  ...rest
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

  const { startUpload, routeConfig, isUploading } = useUploadThing(endpoint, {
    ...rest,
    onClientUploadComplete: (images) => {
      console.log({ images });
      if (images.at(0)) setUploadedImage(images.at(0));
      setPreviewFile(null);
      void rest.onClientUploadComplete?.(images);
    },
  });

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
  const showConfirmButton = !!croppedAreaPixels && !!selectedFile;

  const handleConfirm = useCallback(async () => {
    if (!selectedFile || !croppedAreaPixels) return;
    try {
      const croppedFile = await getCroppedFile({
        imageSrc: selectedFile.url,
        pixelCrop: croppedAreaPixels,
        fileName: getCroppedFileName(selectedFile.file.name),
        mimeType: selectedFile.file.type || "image/jpeg",
      });
      await startUpload([croppedFile]);
    } catch (error) {
      console.error(error);
    }
  }, [croppedAreaPixels, selectedFile, startUpload]);

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
              className="border-primary/40 text-primary hover:border-primary/60 pointer-events-auto w-40"
              asChild
            >
              <label onClick={(e) => e.stopPropagation()}>
                <input
                  {...getInputProps()}
                  disabled={isUploading}
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
            className="border-primary/40 text-primary hover:border-primary/60 pointer-events-auto w-40"
            asChild
          >
            <label>
              <input
                {...getInputProps()}
                disabled={isUploading}
                className="sr-only"
              />
              <BookImage className="size-4" />
              {isDesktop ? "Buscar imagen" : "Galería"}
            </label>
          </Button>
        </div>
      </div>
      {showConfirmButton && (
        <Button
          type="button"
          size="lg"
          className="pointer-events-auto"
          onClick={handleConfirm}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Recortar
            </>
          ) : (
            "Recortar"
          )}
        </Button>
      )}
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

const getCroppedFileName = (originalName: string) => {
  const extensionIndex = originalName.lastIndexOf(".");
  if (extensionIndex === -1) return `${originalName}-cropped`;
  const baseName = originalName.slice(0, extensionIndex);
  const extension = originalName.slice(extensionIndex);
  return `${baseName}-cropped${extension}`;
};

const getCroppedFile = async ({
  imageSrc,
  pixelCrop,
  fileName,
  mimeType,
}: {
  imageSrc: string;
  pixelCrop: Area;
  fileName: string;
  mimeType: string;
}) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const width = Math.max(Math.round(pixelCrop.width), 1);
  const height = Math.max(Math.round(pixelCrop.height), 1);
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to retrieve canvas context");
  }

  const cropX = Math.round(pixelCrop.x);
  const cropY = Math.round(pixelCrop.y);

  ctx.drawImage(image, cropX, cropY, width, height, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((createdBlob) => {
      if (!createdBlob) {
        reject(new Error("Unable to create blob from canvas"));
        return;
      }
      resolve(createdBlob);
    }, mimeType);
  });

  return new File([blob], fileName, { type: mimeType });
};
