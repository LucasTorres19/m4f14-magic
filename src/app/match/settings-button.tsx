"use client";
import ResetButton from "@/components/ResetButton";
import SettingsDialog from "@/components/SettingsDialog";
import Timer from "@/components/Timer";
import TimerSettingsDialog from "@/components/TimerSettingsDialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  History,
  Home,
  Plus,
  RotateCcw,
  Settings,
  Timer as TimerIcon,
} from "lucide-react";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import PlayersDialog from "./players-dialog";
import SaveMatch from "./save-match";

export default function SettingsButton() {
  const [isTimerVisible, setIsTimerVisible] = useState(false);
  const styleBtn: CSSProperties = {
    left: "var(--x)",
    top: "var(--y)",
    width: "var(--hit)",
    height: "var(--hit)",
    transform: "translate(-50%, -50%)",
  };
  return (
    <>
      <Timer
        isVisible={isTimerVisible}
        onVisibilityChange={setIsTimerVisible}
      />
      <div className="pointer-events-none absolute z-40" style={styleBtn}>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="settings"
              size="icon"
              className="pointer-events-auto h-full w-full rounded-full shadow-lg"
            >
              <Settings className="size-8 transition-transform hover:animate-spin" />
            </Button>
          </SheetTrigger>
          <SheetContent hideClose side="bottom" className="gap-0 px-2 py-4">
            <SheetHeader className="p-0">
              <SheetTitle hidden>Bottom Toolbar</SheetTitle>
              <SheetDescription hidden>
                Bottom toolbar with some buttons :D
              </SheetDescription>
            </SheetHeader>
            <div className="relative">
              <div className="pointer-events-auto -mx-2 overflow-x-auto px-2 pb-1">
                <div className="flex w-max items-center gap-3 md:w-full md:justify-center">
                  <Button size="lg" asChild>
                    <Link href="/">
                      <Home className="size-5" />
                    </Link>
                  </Button>

                  <SettingsDialog
                    trigger={
                      <Button
                        size="lg"
                        variant={"success"}
                        className="pointer-events-auto"
                      >
                        <Plus className="size-5" />
                      </Button>
                    }
                  />

                  <PlayersDialog />

                  <ResetButton
                    trigger={
                      <Button
                        size="lg"
                        variant="destructive"
                        className="pointer-events-auto"
                      >
                        <RotateCcw className="size-5" />
                      </Button>
                    }
                  />
                  <TimerSettingsDialog
                    trigger={
                      <Button size="lg" variant="outline">
                        <TimerIcon className="size-5" />
                      </Button>
                    }
                    onShowTimer={() => setIsTimerVisible(true)}
                  />

                  <Button size="lg" asChild>
                    <Link href="/match/hp-history">
                      <History className="size-5" />
                    </Link>
                  </Button>

                  <SaveMatch />
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
