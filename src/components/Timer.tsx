"use client";

import { useCurrentMatch } from "@/app/_stores/current-match-provider";
import { useSettings } from "@/app/_stores/settings-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  GripVertical,
  Pause,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type TimerProps = {
  isVisible?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
};

export default function Timer({
  isVisible: externalIsVisible,
  onVisibilityChange,
}: TimerProps = {}) {
  const timerLimit = useSettings((s) => s.timerLimit);
  const currentPlayerIndex = useCurrentMatch((s) => s.currentPlayerIndex);
  const players = useCurrentMatch((s) => s.players);
  const timerRemaining = useCurrentMatch((s) => s.timerRemaining);
  const isTimerPaused = useCurrentMatch((s) => s.isTimerPaused);
  const nextTurn = useCurrentMatch((s) => s.nextTurn);
  const pauseTimer = useCurrentMatch((s) => s.pauseTimer);
  const resumeTimer = useCurrentMatch((s) => s.resumeTimer);
  const updateTimer = useCurrentMatch((s) => s.updateTimer);
  const resetTimer = useCurrentMatch((s) => s.resetTimer);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const explosionAudioRef = useRef<HTMLAudioElement | null>(null);
  const beepTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [internalIsVisible, setInternalIsVisible] = useState(true);
  const [hasBeeped, setHasBeeped] = useState(false);
  const [exploding, setExploding] = useState(false);
  const hasPrimedRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  const isVisible = externalIsVisible ?? internalIsVisible;

  // Sync external visibility changes
  useEffect(() => {
    if (externalIsVisible !== undefined) {
      setInternalIsVisible(externalIsVisible);
    }
  }, [externalIsVisible]);

  const currentPlayer = players[currentPlayerIndex];
  const isExpired = timerRemaining === 0;

  // Beep sound using Web Audio API
  const playBeep = (opts?: {
    freq?: number;
    durationMs?: number;
    volume?: number;
  }) => {
    try {
      audioContextRef.current ??= new (window.AudioContext ??
        (window as unknown as { webkitAudioContext: AudioContext })
          .webkitAudioContext)();
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = opts?.freq ?? 900;
      oscillator.type = "sine";

      const vol = Math.max(0.01, Math.min(1, opts?.volume ?? 0.25));
      const dur = Math.max(0.04, (opts?.durationMs ?? 140) / 1000);

      gainNode.gain.setValueAtTime(vol, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + dur);
    } catch (error) {
      console.error("Failed to play beep:", error);
    }
  };

  // Prepare explosion audio element once
  useEffect(() => {
    if (!explosionAudioRef.current) {
      const audio = new Audio("/explosion.mp3");
      audio.preload = "auto";
      audio.volume = 0.7;
      explosionAudioRef.current = audio;
    }
  }, []);

  // Explosion sound using provided mp3
  const playExplosion = () => {
    const audio = explosionAudioRef.current;
    if (!audio) return;
    try {
      audio.currentTime = 0;
      // play returns a Promise in most browsers; swallow errors (e.g., autoplay restrictions)
      void audio.play().catch(() => {
        // ignored
      });
    } catch {
      // ignore
    }
  };

  // Mark as primed when timer first becomes > 0 to avoid initial explosion
  useEffect(() => {
    if (timerRemaining > 0) hasPrimedRef.current = true;
  }, [timerRemaining]);

  // Play beep + explosion when timer reaches 0 (only after primed)
  useEffect(() => {
    if (isExpired && !hasBeeped && hasPrimedRef.current) {
      playBeep({ freq: 1700, durationMs: 300, volume: 0.25 });
      playExplosion();
      setExploding(true);
      setTimeout(() => setExploding(false), 800);
      setHasBeeped(true);
    } else if (!isExpired) {
      setHasBeeped(false);
    }
  }, [isExpired, hasBeeped]);

  // C4-style accelerating beeps when under last 10 seconds
  useEffect(() => {
    const threshold = 10; // seconds
    const shouldBeep =
      !isTimerPaused &&
      !isExpired &&
      timerRemaining > 0 &&
      timerRemaining <= threshold;

    if (!shouldBeep) {
      if (beepTimeoutRef.current) {
        clearTimeout(beepTimeoutRef.current);
        beepTimeoutRef.current = null;
      }
      return;
    }

    // schedule next beep with interval shrinking as we approach 0
    // interval maps linearly: remaining 10..0 -> 800ms..150ms
    const t = timerRemaining / threshold; // 1..0
    const interval = Math.round(150 + t * (800 - 150));
    const freq = 1200;

    beepTimeoutRef.current ??= setTimeout(function tick() {
      playBeep({ freq, durationMs: 100, volume: 0.25 });
      // reschedule using current state on next tick
      beepTimeoutRef.current = null;
    }, interval);

    return () => {
      if (beepTimeoutRef.current) {
        clearTimeout(beepTimeoutRef.current);
        beepTimeoutRef.current = null;
      }
    };
  }, [timerRemaining, timerLimit, isTimerPaused, isExpired]);

  useEffect(() => {
    if (isTimerPaused || timerRemaining <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      updateTimer(Math.max(0, timerRemaining - 1));
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerRemaining, isTimerPaused, updateTimer]);

  // Initialize timer only when player changes (new turn)
  useEffect(() => {
    if (
      players.length > 0 &&
      timerRemaining === 0 &&
      !hasBeeped &&
      !isTimerPaused
    ) {
      updateTimer(timerLimit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayerIndex]); // Only trigger on player change

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!dragRef.current || (e.target as HTMLElement).closest("button")) return;
    const rect = dragRef.current.getBoundingClientRect();
    // Calculate current position: getBoundingClientRect gives us the actual viewport position
    // Since we use translate(-50%, 0), the center X is at rect.left + rect.width / 2
    // And position.x stores the center position in pixels when dragged
    const currentX = position.x !== 0 ? position.x : rect.left + rect.width / 2;
    // position.y stores the top position in pixels
    const currentY = position.y !== 0 ? position.y : rect.top;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: currentX,
      offsetY: currentY,
    };
    // Update position state to the calculated position so subsequent drags work correctly
    if (position.x === 0 || position.y === 0) {
      setPosition({ x: currentX, y: currentY });
    }
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!dragRef.current || (e.target as HTMLElement).closest("button")) return;
    const rect = dragRef.current.getBoundingClientRect();
    // Calculate current position: getBoundingClientRect gives us the actual viewport position
    // Since we use translate(-50%, 0), the center X is at rect.left + rect.width / 2
    // And position.x stores the center position in pixels when dragged
    const currentX = position.x !== 0 ? position.x : rect.left + rect.width / 2;
    // position.y stores the top position in pixels
    const currentY = position.y !== 0 ? position.y : rect.top;
    setIsDragging(true);
    const touch = e.touches[0];
    dragStartRef.current = {
      x: touch?.clientX ?? 0,
      y: touch?.clientY ?? 0,
      offsetX: currentX,
      offsetY: currentY,
    };
    // Update position state to the calculated position so subsequent drags work correctly
    if (position.x === 0 || position.y === 0) {
      setPosition({ x: currentX, y: currentY });
    }
    e.preventDefault();
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      setPosition({
        x: dragStartRef.current.offsetX + deltaX,
        y: dragStartRef.current.offsetY + deltaY,
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const deltaX = touch.clientX - dragStartRef.current.x;
      const deltaY = touch.clientY - dragStartRef.current.y;
      setPosition({
        x: dragStartRef.current.offsetX + deltaX,
        y: dragStartRef.current.offsetY + deltaY,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchend", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleReset = () => {
    resetTimer(timerLimit);
    setHasBeeped(false);
  };

  const handleNextTurn = () => {
    nextTurn();
    // Reset timer manually to preserve paused state
    updateTimer(timerLimit);
    setHasBeeped(false);
  };

  const handleStart = () => {
    resumeTimer();
  };

  const handlePause = () => {
    pauseTimer();
  };

  const timePercentage =
    timerLimit > 0 ? (timerRemaining / timerLimit) * 100 : 0;
  const isLowTime = timerRemaining <= 30 && timerRemaining > 0;

  if (players.length === 0 || !isVisible) {
    return null;
  }

  return (
    <div
      ref={dragRef}
      className={cn(
        "fixed z-50 cursor-move select-none",
        isDragging && "cursor-grabbing",
      )}
      style={{
        top: position.y !== 0 ? `${position.y}px` : "1rem",
        left: position.x !== 0 ? `${position.x}px` : "50%",
        transform: "translate(-50%, 0)",
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div
        className={cn(
          "bg-background/95 backdrop-blur-sm border rounded-xl shadow-xl p-6 min-w-[280px] transition-all",
          isExpired && "border-destructive border-2",
        )}
      >
        {/* Explosion visual overlay */}
        {exploding && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <span
              className={cn(
                "block rounded-full bg-destructive/30",
                "transition-transform duration-700 ease-out",
              )}
              style={{
                width: 40,
                height: 40,
                transform: "scale(20)",
                boxShadow: "0 0 120px 40px rgba(239,68,68,0.5)",
              }}
            />
          </div>
        )}
        <div className="flex items-center justify-between mb-3">
          <GripVertical className="size-5 text-muted-foreground" />
          {currentPlayer && (
            <div
              className={cn(
                "text-base font-medium text-center flex-1",
                isExpired && "text-destructive font-bold",
              )}
            >
              Turno: {currentPlayer.displayName}
            </div>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              const newVisible = false;
              setInternalIsVisible(newVisible);
              onVisibilityChange?.(newVisible);
            }}
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex items-center justify-center gap-2 mb-4">
          <div
            className={cn(
              "text-5xl font-mono font-bold transition-colors",
              isExpired ? "text-destructive" : isLowTime && "text-destructive",
            )}
          >
            {formatTime(timerRemaining)}
          </div>
        </div>
        {isExpired && (
          <div className="text-center mb-3 text-destructive font-semibold text-lg animate-pulse">
            ⏰ Turno Finalizado
          </div>
        )}
        <div className="flex gap-3 justify-center">
          {isTimerPaused ? (
            <Button
              size="icon-lg"
              variant="outline"
              onClick={handleStart}
              aria-label="Start"
              disabled={isExpired}
              className="h-12 w-12"
            >
              <Play className="size-6" />
            </Button>
          ) : (
            <Button
              size="icon-lg"
              variant="outline"
              onClick={handlePause}
              aria-label="Pause"
              disabled={isExpired}
              className="h-12 w-12"
            >
              <Pause className="size-6" />
            </Button>
          )}
          <Button
            size="icon-lg"
            variant="outline"
            onClick={handleReset}
            aria-label="Reset"
            disabled={isExpired}
            className="h-12 w-12"
          >
            <RotateCcw className="size-6" />
          </Button>
          <Button
            size="icon-lg"
            variant="outline"
            onClick={handleNextTurn}
            aria-label="Next"
            className="h-12 w-12"
          >
            <ArrowRight className="size-6" />
          </Button>
        </div>
        <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-1000",
              isExpired
                ? "bg-destructive"
                : isLowTime
                  ? "bg-destructive"
                  : "bg-primary",
            )}
            style={{ width: `${Math.max(0, timePercentage)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
