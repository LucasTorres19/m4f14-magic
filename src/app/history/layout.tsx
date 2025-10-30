import type { ReactNode } from "react";

export default function HistoryLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-12 md:px-6 md:py-16">
        {children}
      </div>
    </div>
  );
}
