"use client";
import * as React from "react";

export default function FlyingCards() {

  return (
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className="flying-card absolute"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDuration: `${15 + Math.random() * 10}s`,
            }}
          >
            <div className="from-card/60 to-card/40 border-primary/30 ornate-border h-28 w-20 rounded-lg border-2 bg-linear-to-br opacity-40 shadow-lg backdrop-blur-sm md:h-32 md:w-24" />
          </div>
        ))}
      </div>
  );
}
