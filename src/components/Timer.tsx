"use client";

import { useCurrentMatch } from "@/app/_stores/current-match-provider";
import type { Player } from "@/app/_stores/current-match-store";
import { useSettings } from "@/app/_stores/settings-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Pause,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function Timer({player}: {player: Player}) {
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
  const audioContextRef = useRef<AudioContext | null>(null);
  const explosionAudioRef = useRef<HTMLAudioElement | null>(null);
  const beepTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [hasBeeped, setHasBeeped] = useState(false);
  const [exploding, setExploding] = useState(false);
  
  const hasPrimedRef = useRef(false);

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

  if (!isTimerVisible || player?.playerId !== currentPlayer?.playerId) {
    return null;
  }

  return (
      <div
        className={cn(
          "relative flex items-center justify-between backdrop-blur-sm border rounded-xl shadow-xl overflow-hidden transition-colors pointer-events-auto",
          "w-auto max-w-full bg-black text-white border-white/20 px-4 py-2 gap-4",
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

        {/* Timer Display */}
        <div
          className={cn(
            "font-mono font-bold transition-colors leading-none text-3xl",
            isExpired ? "text-destructive" : isLowTime && "text-destructive",
          )}
        >
          {formatTime(timerRemaining)}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {isTimerPaused ? (
            <Button
              size="icon"
              variant="ghost"
              onClick={handleStart}
              disabled={isExpired}
              className="h-8 w-8 text-white hover:bg-white/20 hover:text-white rounded-full"
            >
              <Play className="size-4 " />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              onClick={handlePause}
              disabled={isExpired}
              className="h-8 w-8 text-white hover:bg-white/20 hover:text-white rounded-full"
            >
              <Pause className="size-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={handleReset}
            disabled={isExpired}
            className="h-8 w-8 text-white hover:bg-white/20 hover:text-white rounded-full"
          >
            <RotateCcw className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleNextTurn}
            className="h-8 w-8 text-white hover:bg-white/20 hover:text-white rounded-full"
          >
            <ArrowRight className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-white hover:bg-white/20 hover:text-white rounded-full"
            onClick={(e) => {
              setTimerVisible(false);
            }}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
  );
}
