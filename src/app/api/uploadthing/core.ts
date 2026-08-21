import { env } from "@/env";
import { MAX_MATCH_IMAGES } from "@/lib/constants";
import { isAuthorizedByCookie } from "@/server/auth";
import { createUploadthing, type FileRouter } from "uploadthing/next";

import { UTApi, UploadThingError } from "uploadthing/server";

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
  profileImageUploader: f(
    {
      image: {
        maxFileSize: "2MB",
        maxFileCount: 1,
        contentDisposition: "inline",
      },
    },
    { awaitServerData: false },
  )
    .middleware(async () => {
      if (!(await isAuthorizedByCookie())) {
        // UploadThingError is the framework's typed 403 response, although it
        // does not extend the native Error class used by this lint rule.
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw new UploadThingError({
          code: "FORBIDDEN",
          message: "Necesitás autorización para cambiar esta foto.",
        });
      }

      return {};
    })
    .onUploadComplete(async () => {
      return;
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
