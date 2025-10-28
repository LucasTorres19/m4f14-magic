import "@/styles/globals.css";

import { Toaster } from "@/components/ui/sonner";
import { TRPCReactProvider } from "@/trpc/react";
import { type Metadata } from "next";
import { Geist } from "next/font/google";

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
      <body className={`font-sans antialiased`}>
        <TRPCReactProvider>{children}</TRPCReactProvider>
        <Toaster />
      </body>
    </html>
  );
}
