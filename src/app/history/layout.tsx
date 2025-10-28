import type { ReactNode } from "react";

const backgroundCards = Array.from({ length: 14 }, (_, index) => ({
  left: `${(index * 37) % 100}vw`,
  top: `${(index * 53) % 100}vh`,
  duration: 16 + ((index * 5) % 10),
  delay: ((index * 7) % 12) / 3,
}));

const backgroundOrbs = [
  "bg-primary/15 float-animation absolute top-10 left-16 h-72 w-72 rounded-full blur-[120px]",
  "bg-accent/15 float-animation absolute bottom-10 right-16 h-80 w-80 rounded-full blur-[130px]",
  "bg-secondary/20 absolute top-1/2 left-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[160px]",
];

export default function HistoryLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        {backgroundCards.map((card, index) => (
          <div
            key={`card-${index}`}
            className="flying-card absolute"
            style={{
              left: card.left,
              top: card.top,
              animationDuration: `${card.duration}s`,
              animationDelay: `${card.delay}s`,
            }}
          >
            <div className="from-card/60 to-card/40 border-primary/30 ornate-border h-24 w-16 rounded-lg border-2 bg-linear-to-br opacity-40 shadow-lg backdrop-blur-sm md:h-32 md:w-24" />
          </div>
        ))}
      </div>

      <div className="absolute inset-0 opacity-40">
        {backgroundOrbs.map((className, index) => (
          <div
            key={`orb-${index}`}
            className={className}
            style={{ animationDelay: `${index * 1.5}s` }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-12 md:px-6 md:py-16">
        {children}
      </div>
    </div>
  );
}
