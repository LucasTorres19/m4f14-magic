"use client";

import { useSettings } from "@/app/_stores/settings-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Timer } from "lucide-react";
import * as React from "react";

type TimerSettingsDialogProps = {
  trigger: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onShowTimer?: () => void;
};

export default function TimerSettingsDialog({
  trigger,
  open,
  onOpenChange,
  onShowTimer,
}: TimerSettingsDialogProps) {
  const settingsSet = useSettings((s) => s.set);
  const timerLimitStore = useSettings((s) => s.timerLimit);

  const [localOpen, setLocalOpen] = React.useState(false);
  const controlled = typeof open === "boolean";
  const isOpen = controlled ? open : localOpen;

  const setOpen = React.useCallback(
    (v: boolean) => {
      if (controlled) {
        onOpenChange?.(v);
      } else {
        setLocalOpen(v);
      }
    },
    [controlled, onOpenChange],
  );

  const [timerLimit, setTimerLimit] = React.useState<number>(
    timerLimitStore ?? 120,
  );

  React.useEffect(() => {
    if (isOpen) {
      setTimerLimit(timerLimitStore);
    }
  }, [isOpen, timerLimitStore]);

  const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));

  const onSave = () => {
    const limit = clamp(
      Number.isFinite(timerLimit) ? timerLimit : (timerLimitStore ?? 120),
      10,
      600,
    );

    settingsSet("timerLimit", limit);
    setOpen(false);
  };

  const handleShowTimer = () => {
    onShowTimer?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Timer Settings</DialogTitle>
          <DialogDescription>
            Configure timer settings and show the timer.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-2">
            <Label htmlFor="timerLimit" className="col-span-2">
              Tiempo límite (segundos)
            </Label>
            <Input
              id="timerLimit"
              type="number"
              min={10}
              max={600}
              value={timerLimit}
              onChange={(e) =>
                setTimerLimit(Number.parseInt(e.target.value, 10))
              }
              className="col-span-2"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleShowTimer}
              className="w-full"
            >
              <Timer className="size-4 mr-2" />
              Mostrar Timer
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancelar
            </Button>
          </DialogClose>
          <Button type="button" onClick={onSave} className="sm:ml-3">
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
