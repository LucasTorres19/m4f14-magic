import "@/styles/globals.css";

import { ourFileRouter } from "@/app/api/uploadthing/core";
import FlyingCards from "@/components/Flying-cards";
import { Toaster } from "@/components/ui/sonner";
import { TRPCReactProvider } from "@/trpc/react";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { extractRouterConfig } from "uploadthing/server";
import { CurrentMatchPovider } from "./_stores/current-match-provider";
import { SettingsPovider } from "./_stores/settings-provider";

export const metadata: Metadata = {
  title: "Mafia Magic",
  description: "Creado por MafiaTeam",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${geist.variable} dark`}>
      <body className={`font-sans antialiased bg-background min-h-screen`}>
        <NextSSRPlugin
          /**
           * The `extractRouterConfig` will extract **only** the route configs
           * from the router to prevent additional information from being
           * leaked to the client. The data passed to the client is the same
           * as if you were to fetch `/api/uploadthing` directly.
           */
          routerConfig={extractRouterConfig(ourFileRouter)}
        />
        <TRPCReactProvider>
          <SettingsPovider>
            <CurrentMatchPovider>
              <FlyingCards />
              {children}
            </CurrentMatchPovider>
          </SettingsPovider>
        </TRPCReactProvider>
        <Toaster />
      </body>
    </html>
  );
}
