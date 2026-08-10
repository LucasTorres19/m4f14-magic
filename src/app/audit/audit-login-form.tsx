"use client";

import { Loader2, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PuzzleToken = {
  id: string;
  label: string;
  symbolClass: string;
};

const PUZZLE_TOKENS: PuzzleToken[] = [
  { id: "w", label: "Mana blanco", symbolClass: "ms-w" },
  { id: "u", label: "Mana azul", symbolClass: "ms-u" },
  { id: "b", label: "Mana negro", symbolClass: "ms-b" },
  { id: "r", label: "Mana rojo", symbolClass: "ms-r" },
  { id: "g", label: "Mana verde", symbolClass: "ms-g" },
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
  const [passwordAccepted, setPasswordAccepted] = useState(false);
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
    const nextProgress = [...puzzleProgress, tokenId];
    setPuzzleProgress(nextProgress);
    if (nextProgress.length === puzzleSequence.length) {
      router.refresh();
    }
  };

  const resetPuzzle = () => {
    setPuzzleSequence(createPuzzleSequence());
    setPuzzleProgress([]);
    setPuzzleError(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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

    setPasswordAccepted(true);
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
              Ingresa la password.
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          {passwordAccepted ? (
            <div className="rounded-xl border border-white/10 bg-background/55 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                    Mana
                  </p>
                  <div className="mt-2 flex gap-2">
                    {puzzleSequence.map((tokenId, index) => {
                      const token = PUZZLE_TOKENS.find(
                        (item) => item.id === tokenId,
                      );
                      if (!token) return null;
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
                          <i
                            className={`ms ms-cost ${token.symbolClass} text-[18px]`}
                            aria-hidden="true"
                          />
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

              <div className="grid grid-cols-5 gap-2">
                {PUZZLE_TOKENS.map((token) => {
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
                      <i
                        className={`ms ms-cost ${token.symbolClass} text-[24px]`}
                        aria-hidden="true"
                      />
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
                  : (puzzleError ??
                    "Repite la secuencia de mana en el orden indicado.")}
              </p>
            </div>
          ) : (
            <>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                autoFocus
                disabled={isPending}
              />
              {error ? (
                <p className="text-destructive text-sm">{error}</p>
              ) : null}
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Continuar
              </Button>
            </>
          )}
        </form>
      </section>
    </main>
  );
}
