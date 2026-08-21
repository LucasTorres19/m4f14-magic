import { env } from "@/env";
import { MAX_MATCH_IMAGES } from "@/lib/constants";
import { createUploadthing, type FileRouter } from "uploadthing/next";

import { UTApi } from "uploadthing/server";

export const utapi = new UTApi({
  token: env.UPLOADTHING_TOKEN,
});

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  imageUploader: f(
    {
      image: {
        /**
         * The client uploads a bounded fullscreen image and a 16:9 card image.
         * Keeping this low prevents accidental raw camera uploads from slowing
         * down the match image flow.
         */
        maxFileSize: "8MB",
        maxFileCount: MAX_MATCH_IMAGES,
        contentDisposition: "inline",
      },
    },
    { awaitServerData: false },
  ).onUploadComplete(async () => {
    return;
  }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
