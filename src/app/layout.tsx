import "@/styles/globals.css";

import { ourFileRouter } from "@/app/api/uploadthing/core";
import FlyingCards from "@/components/Flying-cards";
import { Toaster } from "@/components/ui/sonner";
import { TRPCReactProvider } from "@/trpc/react";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { extractRouterConfig } from "uploadthing/server";
import { LoginGateDialog } from "./_auth/login-gate-dialog";
import { LoginGateOpenerProvider } from "./_auth/login-gate-opener";
import { CurrentMatchPovider } from "./_stores/current-match-provider";
import { SettingsPovider } from "./_stores/settings-provider";

export const metadata: Metadata = {
  title: "Mafia Magic",
  description: "Creado por MafiaTeam",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon0.svg", type: "image/svg+xml" },
      { url: "/icon1.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "apple-mobile-web-app-title": "Mafia Magic",
  },
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
        <LoginGateOpenerProvider>
          <TRPCReactProvider>
            <SettingsPovider>
              <CurrentMatchPovider>
                <FlyingCards />
                {children}
              </CurrentMatchPovider>
            </SettingsPovider>
            <LoginGateDialog />
          </TRPCReactProvider>
        </LoginGateOpenerProvider>
        <Toaster />
      </body>
    </html>
  );
}
