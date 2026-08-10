"use client";

import { Loader2, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuditLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

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
              Ingresa la password para ver los logs.
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            autoFocus
            disabled={isPending}
          />
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Entrar
          </Button>
        </form>
      </section>
    </main>
  );
}
