"use client";

import {
  Circle,
  Diamond,
  Loader2,
  LockKeyhole,
  Square,
  Triangle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { ComponentType, FormEvent } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PuzzleToken = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const PUZZLE_TOKENS: PuzzleToken[] = [
  { id: "circle", label: "Circulo", icon: Circle },
  { id: "triangle", label: "Triangulo", icon: Triangle },
  { id: "diamond", label: "Diamante", icon: Diamond },
  { id: "square", label: "Cuadrado", icon: Square },
];

const createPuzzleSequence = () =>
  [...PUZZLE_TOKENS]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((token) => token.id);

export function AuditLoginForm() {
  const router = useRouter();
  const [puzzleSequence, setPuzzleSequence] = useState(createPuzzleSequence);
  const [puzzleProgress, setPuzzleProgress] = useState<string[]>([]);
  const [puzzleError, setPuzzleError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const puzzleSolved = puzzleProgress.length === puzzleSequence.length;

  const pressPuzzleToken = (tokenId: string) => {
    if (puzzleSolved || isPending) return;

    const expected = puzzleSequence[puzzleProgress.length];
    if (tokenId !== expected) {
      setPuzzleProgress([]);
      setPuzzleError("Secuencia incorrecta. Intentalo de nuevo.");
      return;
    }

    setPuzzleError(null);
    setPuzzleProgress((current) => [...current, tokenId]);
  };

  const resetPuzzle = () => {
    setPuzzleSequence(createPuzzleSequence());
    setPuzzleProgress([]);
    setPuzzleError(null);
    setPassword("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!puzzleSolved) {
      setError("Resuelve la secuencia antes de ingresar.");
      return;
    }

    setError(null);
    setIsPending(true);

    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setIsPending(false);

    if (!response.ok) {
      setPassword("");
      setError("Password incorrecta.");
      return;
    }

    router.refresh();
  };

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <section className="ornate-border rounded-2xl border border-primary/30 bg-card/85 p-6 shadow-2xl backdrop-blur">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
            <LockKeyhole className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Auditoria privada</h1>
            <p className="text-muted-foreground text-sm">
              Resuelve la secuencia y despues ingresa la password.
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <div className="rounded-xl border border-white/10 bg-background/55 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                  Secuencia
                </p>
                <div className="mt-2 flex gap-2">
                  {puzzleSequence.map((tokenId, index) => {
                    const token = PUZZLE_TOKENS.find(
                      (item) => item.id === tokenId,
                    );
                    if (!token) return null;
                    const Icon = token.icon;
                    const solved = puzzleProgress[index] === tokenId;
                    return (
                      <span
                        key={`${tokenId}-${index}`}
                        className={
                          solved
                            ? "flex size-8 items-center justify-center rounded-md border border-emerald-400/50 bg-emerald-500/15 text-emerald-200"
                            : "flex size-8 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary"
                        }
                        title={token.label}
                      >
                        <Icon className="size-4" />
                      </span>
                    );
                  })}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetPuzzle}
                disabled={isPending}
              >
                Nueva
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {PUZZLE_TOKENS.map((token) => {
                const Icon = token.icon;
                return (
                  <Button
                    key={token.id}
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="size-11"
                    onClick={() => pressPuzzleToken(token.id)}
                    disabled={puzzleSolved || isPending}
                    aria-label={token.label}
                  >
                    <Icon className="size-5" />
                  </Button>
                );
              })}
            </div>

            <p
              className={
                puzzleSolved
                  ? "mt-3 text-sm text-emerald-300"
                  : "text-muted-foreground mt-3 text-sm"
              }
            >
              {puzzleSolved
                ? "Secuencia resuelta."
                : (puzzleError ?? "Toca los simbolos en el orden indicado.")}
            </p>
          </div>

          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            autoFocus
            disabled={isPending || !puzzleSolved}
          />
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <Button
            type="submit"
            className="w-full"
            disabled={isPending || !puzzleSolved}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Entrar
          </Button>
        </form>
      </section>
    </main>
  );
}
