"use client";

import { useCurrentMatch } from "@/app/_stores/current-match-provider";
import { useSettings } from "@/app/_stores/settings-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  GripVertical,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type TimerProps = {
  attached?: boolean;
};

export default function Timer({
  attached = false,
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
  const isTimerVisible = useCurrentMatch((s) => s.isTimerVisible);
  const setTimerVisible = useCurrentMatch((s) => s.setTimerVisible);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const explosionAudioRef = useRef<HTMLAudioElement | null>(null);
  const beepTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 320, height: 180 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [hasBeeped, setHasBeeped] = useState(false);
  const [exploding, setExploding] = useState(false);
  
  const hasPrimedRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

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

    const t = timerRemaining / threshold; // 1..0
    const interval = Math.round(150 + t * (800 - 150));
    const freq = 1200;

    beepTimeoutRef.current ??= setTimeout(function tick() {
      playBeep({ freq, durationMs: 100, volume: 0.25 });
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
    }, [currentPlayerIndex]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      attached ||
      !dragRef.current ||
      (e.target as HTMLElement).closest("button") ||
      (e.target as HTMLElement).closest(".resize-handle")
    )
      return;
      
    const rect = dragRef.current.getBoundingClientRect();
    const currentX = position.x !== 0 ? position.x : rect.left + rect.width / 2;
    const currentY = position.y !== 0 ? position.y : rect.top;
    
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: currentX,
      offsetY: currentY,
    };
    
    if (position.x === 0 || position.y === 0) {
      setPosition({ x: currentX, y: currentY });
    }
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (
      attached ||
      !dragRef.current ||
      (e.target as HTMLElement).closest("button") ||
      (e.target as HTMLElement).closest(".resize-handle")
    )
      return;
      
    const rect = dragRef.current.getBoundingClientRect();
    const currentX = position.x !== 0 ? position.x : rect.left + rect.width / 2;
    const currentY = position.y !== 0 ? position.y : rect.top;
    
    setIsDragging(true);
    const touch = e.touches[0];
    dragStartRef.current = {
      x: touch?.clientX ?? 0,
      y: touch?.clientY ?? 0,
      offsetX: currentX,
      offsetY: currentY,
    };
    
    if (position.x === 0 || position.y === 0) {
      setPosition({ x: currentX, y: currentY });
    }
    e.preventDefault();
  };

  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent) => {
    if (attached) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    };
  };

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;
        setPosition({
          x: dragStartRef.current.offsetX + deltaX,
          y: dragStartRef.current.offsetY + deltaY,
        });
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStartRef.current.x;
        const deltaY = e.clientY - resizeStartRef.current.y;
        setSize({
          width: Math.max(200, resizeStartRef.current.width + deltaX),
          height: Math.max(140, resizeStartRef.current.height + deltaY),
        });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        const touch = e.touches[0];
        if (!touch) return;
        const deltaX = touch.clientX - dragStartRef.current.x;
        const deltaY = touch.clientY - dragStartRef.current.y;
        setPosition({
          x: dragStartRef.current.offsetX + deltaX,
          y: dragStartRef.current.offsetY + deltaY,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
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
  }, [isDragging, isResizing]);

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
    updateTimer(timerLimit);
    setHasBeeped(false);
  };

  const handleStart = () => {
    resumeTimer();
  };

  const handlePause = () => {
    pauseTimer();
  };

  const isLowTime = timerRemaining <= 30 && timerRemaining > 0;

  if (players.length === 0 || !isTimerVisible) {
    return null;
  }

  return (
    <div
      ref={dragRef}
      className={cn(
        attached ? "absolute pointer-events-none" : "fixed z-50",
        !attached && "select-none",
        !attached && (isDragging ? "cursor-grabbing" : "cursor-move"),
      )}
      style={attached ? undefined : {
        top: position.y !== 0 ? `${position.y}px` : "1rem",
        left: position.x !== 0 ? `${position.x}px` : "50%",
        width: size.width,
        height: size.height,
        transform: "translate(-50%, 0)",
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div
        className={cn(
          "relative flex flex-col backdrop-blur-sm border rounded-xl shadow-xl overflow-hidden transition-colors pointer-events-auto",
          attached ? "w-64 shadow-2xl border-2 bg-black text-white border-white/20" : "h-full w-full bg-background/95",
          isExpired && "border-destructive border-2",
        )}
      >
        {/* Explosion visual overlay */}
        {exploding && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded-xl">
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

        {/* Header */}
        <div className={cn(
          "flex items-center justify-between px-3 py-2 border-b",
          attached ? "bg-white/10 border-white/10" : "bg-muted/30"
        )}>
          <div className="flex items-center gap-2 overflow-hidden">
            {!attached && <GripVertical className="size-4 text-muted-foreground shrink-0" />}
            {currentPlayer && (
              <span className="text-sm font-medium truncate">
                {currentPlayer.displayName}
              </span>
            )}
          </div>
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "h-6 w-6 shrink-0",
              attached ? "hover:bg-white/20 hover:text-white" : "hover:bg-destructive/10 hover:text-destructive"
            )}
            onClick={(e) => {
              setTimerVisible(false);
            }}
          >
            <X className="size-3" />
          </Button>
        </div>

        {/* Timer Display */}
        <div className="flex-1 flex items-center justify-center min-h-0 py-2">
          <div
            className={cn(
              "font-mono font-bold transition-colors leading-none",
              isExpired ? "text-destructive" : isLowTime && "text-destructive",
            )}
            style={attached ? { fontSize: "3rem" } : { fontSize: `${Math.min(size.width / 4, size.height / 2)}px` }}
          >
            {formatTime(timerRemaining)}
          </div>
        </div>

        {/* Controls */}
        <div className={cn(
          "flex items-center justify-center gap-2 p-3",
          attached ? "bg-white/5" : "bg-muted/10"
        )}>
          {isTimerPaused ? (
            <Button
              size="icon"
              variant="outline"
              onClick={handleStart}
              disabled={isExpired}
              className={cn("h-8 w-8", attached && "bg-transparent border-white/20 text-white hover:bg-white/20 hover:text-white")}
            >
              <Play className="size-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="outline"
              onClick={handlePause}
              disabled={isExpired}
              className={cn("h-8 w-8", attached && "bg-transparent border-white/20 text-white hover:bg-white/20 hover:text-white")}
            >
              <Pause className="size-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="outline"
            onClick={handleReset}
            disabled={isExpired}
            className={cn("h-8 w-8", attached && "bg-transparent border-white/20 text-white hover:bg-white/20 hover:text-white")}
          >
            <RotateCcw className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={handleNextTurn}
            className={cn("h-8 w-8", attached && "bg-transparent border-white/20 text-white hover:bg-white/20 hover:text-white")}
          >
            <ArrowRight className="size-4" />
          </Button>
        </div>

        {/* Resize Handle */}
        {!attached && (
          <div
            className="resize-handle absolute bottom-0 right-0 p-1 cursor-nwse-resize hover:bg-muted/50 rounded-tl-lg transition-colors z-20"
            onMouseDown={handleResizeStart}
          >
            <Maximize2 className="size-4 text-muted-foreground/50 rotate-90" />
          </div>
        )}
      </div>
    </div>
  );
}
