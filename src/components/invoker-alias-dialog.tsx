"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/trpc/react";
import { Loader2, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const MAX_ALIAS_LENGTH = 80;

export function InvokerAliasDialog({
  playerId,
  playerName,
  alias,
}: {
  playerId: number;
  playerName: string;
  alias?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(alias ?? "");
  const utils = api.useUtils();
  const updateAlias = api.players.updateAlias.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.players.detail.invalidate({ playerId }),
        utils.players.listWithStats.invalidate(),
      ]);
      toast.success(alias ? "Alias actualizado" : "Alias agregado");
      setOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "No se pudo actualizar el alias.");
    },
  });

  useEffect(() => {
    if (open) setValue(alias ?? "");
  }, [alias, open]);

  const trimmedValue = value.trim();

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => !updateAlias.isPending && setOpen(nextOpen)}
    >
      <DialogTrigger asChild>
        {alias ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-10 shrink-0 rounded-full active:scale-[0.96] transition-transform"
            aria-label={`Editar alias de ${playerName}`}
          >
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-10 px-2 text-muted-foreground active:scale-[0.96] transition-transform"
          >
            <Pencil className="size-4" />
            Agregar alias
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alias de {playerName}</DialogTitle>
          <DialogDescription>
            El nombre oficial seguirá siendo el principal. El alias aparecerá
            como subtítulo.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <Label htmlFor={`alias-${playerId}`}>Alias opcional</Label>
          <Input
            id={`alias-${playerId}`}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            maxLength={MAX_ALIAS_LENGTH}
            placeholder="El Gordo Coca"
            autoComplete="off"
          />
          <p className="text-right text-xs tabular-nums text-muted-foreground">
            {value.length}/{MAX_ALIAS_LENGTH}
          </p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={updateAlias.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() =>
              updateAlias.mutate({
                playerId,
                alias: trimmedValue.length > 0 ? trimmedValue : null,
              })
            }
            disabled={updateAlias.isPending || trimmedValue === (alias ?? "")}
          >
            {updateAlias.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
