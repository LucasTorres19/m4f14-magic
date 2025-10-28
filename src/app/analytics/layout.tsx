import type { ReactNode } from "react";

const floatingSigils = Array.from({ length: 12 }, (_, index) => ({
  left: `${(index * 29) % 100}vw`,
  top: `${(index * 47) % 100}vh`,
  duration: 18 + ((index * 3) % 9),
  delay: ((index * 5) % 11) / 3,
}));

const etherVeils = [
  "bg-primary/20 float-animation absolute top-12 left-10 h-72 w-72 rounded-full blur-[120px]",
  "bg-accent/15 float-animation absolute bottom-16 right-12 h-80 w-80 rounded-full blur-[140px]",
  "bg-secondary/25 absolute top-1/2 left-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[180px]",
];

export default function AnalyticsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="bg-background relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        {floatingSigils.map((sigil, index) => (
          <div
            key={`sigil-${index}`}
            className="flying-card absolute"
            style={{
              left: sigil.left,
              top: sigil.top,
              animationDuration: `${sigil.duration}s`,
              animationDelay: `${sigil.delay}s`,
            }}
          >
            <div className="from-card/60 to-card/40 border-primary/30 ornate-border h-24 w-16 rounded-lg border-2 bg-linear-to-br opacity-40 shadow-lg backdrop-blur-sm md:h-32 md:w-24" />
          </div>
        ))}
      </div>

      <div className="absolute inset-0 opacity-40">
        {etherVeils.map((className, index) => (
          <div
            key={`veil-${index}`}
            className={className}
            style={{ animationDelay: `${index * 1.25}s` }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-12 md:px-8 md:py-16">
        {children}
      </div>
    </div>
  );
}
