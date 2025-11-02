"use client";

import { GripVertical, Loader2, Save } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type DragEvent,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useShallow } from "zustand/react/shallow";

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

import { cn } from "@/lib/utils";
import { api, type RouterOutputs } from "@/trpc/react";
import { toast } from "sonner";

import { CommanderCombobox } from "@/components/commander-combobox";
import {
  getCroppedFile,
  getCroppedFileName,
  ImageUploadButton,
  type SelectedFile,
} from "@/components/image-upload-button";
import {
  PlayerCombobox,
  type PlayerSelection,
} from "@/components/player-combobox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUploadThing } from "@/components/uploadthing";
import type { Area } from "react-easy-crop";
import { useCurrentMatch } from "../_stores/current-match-provider";
import type { Player } from "../_stores/current-match-store";
import { useSettings } from "../_stores/settings-provider";

type OrderedPlayer = Pick<
  Player,
  "id" | "displayName" | "backgroundColor" | "commander" | "playerId"
>;

type SuggestedPlayer = {
  id: number;
  name: string;
  backgroundColor: string;
};

type CommanderOption = RouterOutputs["commanders"]["search"][number];

function computeInitialRanking(
  players: Player[],
  hpHistory: Array<{ playerId: string; currentHp: number }>,
) {
  const eliminationOrder = new Map<string, number>();

  hpHistory.forEach((entry, index) => {
    if (entry.currentHp <= 0 && !eliminationOrder.has(entry.playerId)) {
      eliminationOrder.set(entry.playerId, index);
    }
  });

  const sorted = [...players].sort((a, b) => {
    const aliveA = a.hp > 0;
    const aliveB = b.hp > 0;

    if (aliveA !== aliveB) return aliveA ? -1 : 1;

    const elimA = eliminationOrder.get(a.id);
    const elimB = eliminationOrder.get(b.id);
    const scoreA =
      elimA ?? (aliveA ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);

    const scoreB =
      (elimB ?? aliveB) ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;

    if (scoreA !== scoreB) return scoreB - scoreA;

    return b.hp - a.hp;
  });

  return sorted;
}

export default function SaveMatch() {
  const { players, hpHistory, resetMatch } = useCurrentMatch(
    useShallow((state) => ({
      players: state.players,
      hpHistory: state.hpHistory,
      resetMatch: state.restartMatch,
    })),
  );

  const settings = useSettings((state) => state);
  const startingHp = settings.startingHp;
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const { startUpload, routeConfig, isUploading } = useUploadThing(
    "imageUploader",
    {
      onUploadBegin: () => {
        setErrorMessage(null);
      },
      onUploadError: (error: Error) => {
        const message =
          error instanceof Error && error.message.length > 0
            ? error.message
            : "No pudimos subir las imágenes. Intentá nuevamente.";
        setErrorMessage(message);
        toast.error(message);
      },
    },
  );

  const playersQuery = api.players.findAll.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
  });
  const playerSuggestions = useMemo<SuggestedPlayer[]>(() => {
    if (!playersQuery.data) return [];

    return playersQuery.data
      .map((player) => ({
        id: player.id,
        name: (player.name ?? "").trim(),
        backgroundColor: player.backgroundColor,
      }))
      .filter((player) => player.name.length > 0);
  }, [playersQuery.data]);

  const isMatchFinished = useMemo(
    () => players.filter((player) => player.hp > 0).length === 1,
    [players],
  );

  const initialOrder = useMemo(
    () => computeInitialRanking(players, hpHistory),
    [players, hpHistory],
  );

  const mapToOrderedPlayers = useCallback(
    (list: Player[]): OrderedPlayer[] =>
      list.map((player) => ({
        id: player.id,
        displayName: player.displayName,
        backgroundColor: player.backgroundColor,
        commander: player.commander,
        playerId: player.playerId ?? null,
      })),
    [],
  );

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [orderedPlayers, setOrderedPlayers] = useState<OrderedPlayer[]>(() =>
    mapToOrderedPlayers(initialOrder),
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [activePointer, setActivePointer] = useState<{
    pointerId: number;
    playerId: string;
  } | null>(null);
  const [comboboxActive, setComboboxActive] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setOrderedPlayers(mapToOrderedPlayers(initialOrder));
      setDraggingId(null);
      setActivePointer(null);
    }
  }, [initialOrder, mapToOrderedPlayers, open]);

  useEffect(() => {
    if (open) {
      setStep(1);
      setOrderedPlayers(mapToOrderedPlayers(initialOrder));
      setErrorMessage(null);
      setDraggingId(null);
      setActivePointer(null);
    }
  }, [initialOrder, mapToOrderedPlayers, open]);

  useEffect(() => {
    if (comboboxActive) {
      setActivePointer(null);
      setDraggingId(null);
    }
  }, [comboboxActive]);

  const handleComboboxInteractionChange = useCallback((isActive: boolean) => {
    setComboboxActive(isActive);
  }, []);

  const sanitizePlayers = useCallback(() => {
    const sanitized = orderedPlayers.map((player, index) => ({
      name: player.displayName.trim(),
      backgroundColor: player.backgroundColor,
      placement: index + 1,
      commanderId: player.commander?.id,
    }));

    const hasEmptyNames = sanitized.some((player) => player.name.length === 0);
    if (hasEmptyNames) {
      setErrorMessage("Todos los invocadores necesitan un nombre.");
      return null;
    }

    const hasDuplicateNames =
      new Set(sanitized.map((player) => player.name)).size !== sanitized.length;
    if (hasDuplicateNames) {
      setErrorMessage("Cada invocador debe tener un nombre único.");
      return null;
    }

    setErrorMessage(null);
    return sanitized;
  }, [orderedPlayers, setErrorMessage]);

  const handleContinueToImages = useCallback(() => {
    const sanitized = sanitizePlayers();
    if (!sanitized) return;
    setStep(2);
  }, [sanitizePlayers, setStep]);

  const handleBackToPlacements = useCallback(() => {
    setStep(1);
    setErrorMessage(null);
  }, [setErrorMessage, setStep]);

  const matchSave = api.match.save.useMutation({
    onSuccess: () => {
      toast.success("Partida guardada");
      resetMatch(settings);
    },
  });

  const handleCommanderChange = useCallback(
    (id: string, commander: CommanderOption | null) => {
      setOrderedPlayers((previous) =>
        previous.map((player) =>
          player.id === id ? { ...player, commander } : player,
        ),
      );
    },
    [],
  );

  const handlePlayerChange = useCallback(
    (id: string, selection: PlayerSelection) => {
      setOrderedPlayers((previous) =>
        previous.map((player) =>
          player.id === id
            ? {
                ...player,
                displayName: selection.name,
                playerId: selection.id ?? null,
              }
            : player,
        ),
      );
      setErrorMessage(null);
    },
    [setErrorMessage],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (matchSave.isPending) return;
      if (isUploading) {
        setErrorMessage("Esperá a que las imágenes terminen de subir.");
        return;
      }
      let croppedImage = undefined;
      let image = undefined;

      if (selectedFile) {
        if (!croppedArea) {
          setErrorMessage("No se pudo recortar.");
          return;
        }
        const croppedFile = await getCroppedFile({
          imageSrc: selectedFile.url,
          pixelCrop: croppedArea,
          fileName: getCroppedFileName(selectedFile?.file.name ?? `match`),
          mimeType: selectedFile?.file.type ?? "image/jpeg",
        });
        const files = await startUpload([croppedFile, selectedFile.file]);
        if (!files) {
          setErrorMessage("No se pudo subir la imagen.");
          return;
        }
        const [uploadedCroppedFile, uploadedFile] = files.map((f) => ({
          url: f.url,
          key: f.key,
        }));
        if (!uploadedCroppedFile || !uploadedFile) {
          setErrorMessage("No se pudo subir la imagen.");
          return;
        }
        croppedImage = uploadedCroppedFile;
        image = uploadedFile;
      }

      try {
        const sanitizedPlayers = sanitizePlayers();
        if (!sanitizedPlayers) return;

        await matchSave.mutateAsync({
          startingHp,
          players: sanitizedPlayers,
          croppedImage,
          image,
        });

        setOpen(false);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No pudimos finalizar la partida. Intenta nuevamente.",
        );
        console.error(error);
      }
    },
    [
      startUpload,
      isUploading,
      matchSave,
      sanitizePlayers,
      startingHp,
      croppedArea,
      selectedFile,
    ],
  );

  const handleDragStart = useCallback(
    (event: DragEvent<HTMLLIElement>, id: string) => {
      if (comboboxActive) {
        event.preventDefault();
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          "input, button, textarea, select, [contenteditable='true']",
        )
      ) {
        event.preventDefault();
        return;
      }

      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", id);
      setDraggingId(id);
    },
    [comboboxActive],
  );

  const reorderPlayers = useCallback(
    (sourceId: string, targetId: string | null) => {
      setOrderedPlayers((previous) => {
        const sourceIndex = previous.findIndex(
          (player) => player.id === sourceId,
        );
        if (sourceIndex === -1) return previous;

        if (targetId === null) {
          if (sourceIndex === previous.length - 1) return previous;
          const updated = [...previous];
          const [moved] = updated.splice(sourceIndex, 1);
          if (moved) updated.push(moved);
          return updated;
        }

        const targetIndexOriginal = previous.findIndex(
          (player) => player.id === targetId,
        );
        if (targetIndexOriginal === -1) return previous;

        if (
          sourceIndex === targetIndexOriginal ||
          sourceIndex === targetIndexOriginal - 1
        ) {
          return previous;
        }

        const updated = [...previous];
        const [moved] = updated.splice(sourceIndex, 1);
        const targetIndexAdjusted =
          sourceIndex < targetIndexOriginal
            ? targetIndexOriginal - 1
            : targetIndexOriginal;
        if (moved) updated.splice(targetIndexAdjusted, 0, moved);
        return updated;
      });
    },
    [],
  );

  const handleDragOverItem = useCallback(
    (event: DragEvent<HTMLLIElement>, targetId: string) => {
      if (comboboxActive) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      if (!draggingId || draggingId === targetId) return;
      reorderPlayers(draggingId, targetId);
    },
    [draggingId, reorderPlayers, comboboxActive],
  );

  const handleDropItem = useCallback(
    (event: DragEvent<HTMLLIElement>, targetId: string) => {
      if (comboboxActive) return;
      event.preventDefault();
      const droppedId = event.dataTransfer.getData("text/plain") || draggingId;
      if (droppedId && droppedId !== targetId) {
        reorderPlayers(droppedId, targetId);
      }
      setDraggingId(null);
    },
    [draggingId, reorderPlayers, comboboxActive],
  );

  const handleDropToEnd = useCallback(
    (event: DragEvent<HTMLLIElement>) => {
      if (comboboxActive) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      const droppedId = event.dataTransfer.getData("text/plain") || draggingId;
      if (!droppedId) return;
      reorderPlayers(droppedId, null);
      setDraggingId(null);
    },
    [draggingId, reorderPlayers, comboboxActive],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLLIElement>, playerId: string) => {
      if (comboboxActive) return;

      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          "input, button, textarea, select, [contenteditable='true']",
        )
      ) {
        return;
      }

      if (event.pointerType === "mouse") return;
      event.preventDefault();
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Some browsers might not support pointer capture on this element.
      }
      setActivePointer({ pointerId: event.pointerId, playerId });
      setDraggingId(playerId);
    },
    [comboboxActive],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLLIElement>) => {
      if (comboboxActive) return;
      if (!activePointer || activePointer.pointerId !== event.pointerId) return;
      if (event.pointerType === "mouse") return;
      if (typeof window === "undefined" || typeof document === "undefined")
        return;

      event.preventDefault();

      const targetElement = document.elementFromPoint(
        event.clientX,
        event.clientY,
      );
      if (!targetElement) return;

      const dropTarget = targetElement.closest("[data-player-id]");
      if (!dropTarget || !(dropTarget instanceof HTMLElement)) return;

      const targetId = dropTarget.dataset?.playerId ?? null;
      if (!targetId || targetId === activePointer.playerId) return;

      if (targetId === "__drop-end") {
        reorderPlayers(activePointer.playerId, null);
        return;
      }

      reorderPlayers(activePointer.playerId, targetId);
    },
    [activePointer, reorderPlayers, comboboxActive],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLLIElement>) => {
      if (comboboxActive) return;
      if (!activePointer || activePointer.pointerId !== event.pointerId) return;
      if (event.pointerType === "mouse") return;

      event.preventDefault();
      try {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      } catch {
        // Ignore if pointer capture is not supported.
      }
      setActivePointer(null);
      setDraggingId(null);
    },
    [activePointer, comboboxActive],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
  }, []);

  if (!isMatchFinished) return null;

  const orderedWithPlacements = orderedPlayers.map((player, index) => {
    const initials = player.displayName.trim().slice(0, 2).toUpperCase();
    return {
      ...player,
      placement: index + 1,
      initials: initials.length > 0 ? initials : "??",
    };
  });

  const isLoading = isUploading || matchSave.isPending;

  return (
    <div className="">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="success"
            size="lg"
            className="pointer-events-auto"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Save />}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md overflow-hidden">
          <ScrollArea type="auto" className="max-h-[85vh] pr-4">
            <DialogHeader>
              <DialogTitle>Finalizar partida</DialogTitle>
              <DialogDescription>
                {step === 1
                  ? "Ajustá el podio arrastrando a los invocadores si queres cambiar la posición final."
                  : "Subí las capturas del duelo que quieras guardar junto a la partida."}
              </DialogDescription>
            </DialogHeader>

            <form className="flex flex-col gap-4 mt-2" onSubmit={handleSubmit}>
              <div className="text-muted-foreground flex items-center justify-between text-xs">
                <span>Paso {step} de 2</span>
                <span>
                  {step === 1
                    ? "Ordená y confirmá invocadores"
                    : "Agregá capturas"}
                </span>
              </div>

              {step === 1 ? (
                <ul className="flex flex-col gap-2">
                  {orderedWithPlacements.map((player) => (
                    <li
                      key={player.id}
                      draggable={!comboboxActive}
                      onDragStart={(event) => handleDragStart(event, player.id)}
                      onDrop={(event) => handleDropItem(event, player.id)}
                      onDragOver={(event) =>
                        handleDragOverItem(event, player.id)
                      }
                      onPointerDown={(event) =>
                        handlePointerDown(event, player.id)
                      }
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      onDragEnd={handleDragEnd}
                      data-player-id={player.id}
                      style={{ touchAction: comboboxActive ? "auto" : "none" }}
                      className={cn(
                        "border-border bg-muted/50 flex cursor-grab items-center gap-3 rounded-lg border px-3 py-2 transition-colors active:cursor-grabbing",
                        draggingId === player.id && "opacity-60",
                      )}
                    >
                      <span className="w-[1ch] text-lg font-semibold shrink-0">
                        {player.placement}
                      </span>

                      <div
                        className="text-background flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                        style={{ backgroundColor: player.backgroundColor }}
                      >
                        {player.initials}
                      </div>

                      <div className="flex grow flex-col gap-2">
                        <div>
                          <PlayerCombobox
                            value={{
                              id: player.playerId ?? null,
                              name: player.displayName,
                              backgroundColor: player.backgroundColor,
                            }}
                            onChange={(selection) =>
                              handlePlayerChange(player.id, selection)
                            }
                            ariaLabel={`Nombre del invocador en posición ${player.placement}`}
                            placeholder="Invocador"
                            suggestions={playerSuggestions}
                            onInteractionChange={
                              handleComboboxInteractionChange
                            }
                          />
                        </div>
                        <div>
                          <CommanderCombobox
                            value={player.commander}
                            onSelect={(commander) =>
                              handleCommanderChange(player.id, commander)
                            }
                            ariaLabel={`Comandante seleccionado por el invocador en posición ${player.placement}`}
                            placeholder="Comandante"
                            playerId={player.playerId ?? null}
                            onInteractionChange={
                              handleComboboxInteractionChange
                            }
                          />
                        </div>
                      </div>

                      <GripVertical className="text-muted-foreground size-4 shrink-0" />
                    </li>
                  ))}
                  <li
                    onDrop={handleDropToEnd}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                    }}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    data-player-id="__drop-end"
                    style={{ touchAction: comboboxActive ? "auto" : "none" }}
                    className="border-border/70 text-muted-foreground flex items-center justify-center rounded-lg border border-dashed px-3 py-2 text-xs"
                  >
                    Soltá acá para mover al final
                  </li>
                </ul>
              ) : (
                <ImageUploadButton
                  onFileSelected={setSelectedFile}
                  onCroppedAreaChange={setCroppedArea}
                  disabled={isLoading}
                  routeConfig={routeConfig}
                />
              )}

              <DialogFooter className="gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setOpen(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                {step === 2 ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBackToPlacements}
                      disabled={isLoading}
                    >
                      Volver
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading && <Loader2 className="size-4 animate-spin" />}
                      Finalizar
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    onClick={handleContinueToImages}
                    disabled={isLoading}
                  >
                    Continuar
                  </Button>
                )}
              </DialogFooter>

              {errorMessage ? (
                <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
                  {errorMessage}
                </p>
              ) : null}
            </form>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
