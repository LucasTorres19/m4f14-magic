"use client";

import { api } from "@/trpc/react";
import Image from "next/image";
import { useMemo, type CSSProperties } from "react";

type Props = { limit?: number; count?: number; query?: string };

type CSSVars = CSSProperties & {
  "--dx"?: string | number;
  "--dy"?: string | number;
  "--baseR"?: string | number;
  "--tiltA"?: string | number;
};

const rnd = (min: number, max: number) => min + Math.random() * (max - min);
const pickSign = () => (Math.random() < 0.5 ? -1 : 1);

const DX_MIN = 120,
  DX_MAX = 280;
const DY_MIN = 80,
  DY_MAX = 220;

export default function FlyingCards({
  limit = 24,
  count = 16,
  query = "",
}: Props) {
  const { data } = api.commanders.list.useQuery({ query, limit });

  const images = useMemo(() => {
    const rows = (data ?? []) as Array<{ imageUrl: string | null }>;
    return rows.map((r) => r.imageUrl ?? "/placeholder.svg").filter(Boolean);
  }, [data]);

  const items = useMemo(() => {
    const srcs = images.length > 0 ? images : ["/placeholder.svg"];
    return Array.from({ length: count }).map((_, i) => {
      const dx = pickSign() * rnd(DX_MIN, DX_MAX);
      const dy = pickSign() * rnd(DY_MIN, DY_MAX);
      return {
        key: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        dur: `${rnd(16, 28)}s`,
        delay: `${rnd(0, 6)}s`,
        angle: rnd(-18, 18),
        dx,
        dy,
        src: srcs[i % srcs.length]!,
      };
    });
  }, [images, count]);

  if (images.length === 0) return null;

  return (
    <div className="pointer-events-none fixed -z-50 inset-0 overflow-hidden max-w-screen max-h-screen">
      <div className="bg-primary/20 opacity-30 float-animation absolute top-20 left-20 h-96 w-96 rounded-full blur-[120px]" />
      <div
        className="bg-accent/20 float-animation opacity-30 absolute right-20 bottom-20 h-96 w-96 rounded-full blur-[120px]"
        style={{ animationDelay: "2s" }}
      />
      <div className="bg-secondary/10 opacity-30 absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[150px]" />
      {items.map((it) => {
        const orbitStyle: CSSVars = {
          left: it.left,
          top: it.top,
          "--dx": `${it.dx}px`,
          "--dy": `${it.dy}px`,
          animation: `fc-orbit ${it.dur} ease-in-out infinite`,
          animationDelay: it.delay,
        };

        const cardStyle: CSSVars = {
          "--baseR": `${it.angle}deg`,
          "--tiltA": `${pickSign() * rnd(0, 10)}deg`,
          transform: `rotate(var(--baseR))`,
          overflow: "hidden",
          zIndex: it.key,
          animation: `fc-tilt ${rnd(4, 8)}s ease-in-out infinite`,
          animationDelay: it.delay,
        };

        return (
          <div
            key={it.key}
            className="absolute will-change-transform"
            style={orbitStyle}
          >
            <div
              className="relative md:h-32 md:w-24 h-28 w-20 rounded-lg drop-shadow-lg"
              style={cardStyle}
            >
              <div className="relative h-full w-full">
                <Image
                  src={it.src}
                  alt=""
                  fill
                  className="rounded-lg object-cover"
                  unoptimized
                  style={{
                    filter:
                      "grayscale(1) saturate(0.25) brightness(0.9) contrast(0.9)",
                  }}
                />
                <div className="absolute inset-0 rounded-lg pointer-events-none bg-black/75" />
              </div>
            </div>
          </div>
        );
      })}

      <style jsx>{`
        @keyframes fc-orbit {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          25% {
            transform: translate3d(
                calc(var(--dx) * 0.5),
                calc(var(--dy) * 0.35),
                0
              )
              scale(1.02);
          }
          50% {
            transform: translate3d(var(--dx), var(--dy), 0) scale(1);
          }
          75% {
            transform: translate3d(
                calc(var(--dx) * 0.5),
                calc(var(--dy) * 0.65),
                0
              )
              scale(0.98);
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        @keyframes fc-tilt {
          0% {
            transform: rotate(calc(var(--baseR) - var(--tiltA)));
          }
          50% {
            transform: rotate(calc(var(--baseR) + var(--tiltA)));
          }
          100% {
            transform: rotate(calc(var(--baseR) - var(--tiltA)));
          }
        }
      `}</style>
    </div>
  );
}
