import { useCallback, useEffect, useRef } from "react";

type LongPressOpts = {
  onStart?: () => void;
  onFinish?: () => void; // finger released after threshold
  onCancel?: () => void; // gesture canceled (scroll, nav away, etc.)
  threshold?: number; // ms to consider "long"
};

export function useStableLongPress(
  onLongPress: () => void,
  { onStart, onFinish, onCancel, threshold = 500 }: LongPressOpts = {},
) {
  const timerRef = useRef<number | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const didFireRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const end = useCallback(
    (kind: "finish" | "cancel") => {
      clearTimer();
      // release capture just in case
      if (targetRef.current && pointerIdRef.current != null) {
        try {
          targetRef.current.releasePointerCapture(pointerIdRef.current);
        } catch {}
      }
      const fired = didFireRef.current;
      didFireRef.current = false;
      pointerIdRef.current = null;

      if (kind === "finish") {
        if (fired) {
          onFinish?.();
        } else {
          onCancel?.();
        }
      } else {
        onCancel?.();
      }
    },
    [onFinish, onCancel],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      // Only primary pointer
      if (e.button !== 0) return;

      targetRef.current = e.currentTarget;
      pointerIdRef.current = e.pointerId;

      // Prevent native long-press menu / text selection
      e.preventDefault();

      // Capture the pointer so we still get events even if finger leaves the element
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}

      onStart?.();

      didFireRef.current = false;
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        didFireRef.current = true;
        onLongPress();
      }, threshold);
    },
    [onStart, onLongPress, threshold],
  );

  const onPointerUp = useCallback(() => end("finish"), [end]);
  const onPointerCancel = useCallback(() => end("cancel"), [end]);
  const onLostCapture = useCallback(() => end("cancel"), [end]);

  // Global fallbacks: tab hidden, window blurred → cancel
  useEffect(() => {
    const vis = () => end("cancel");
    const blur = () => end("cancel");
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("blur", blur);
    return () => {
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("blur", blur);
    };
  }, [end]);

  // Optional: kill Android context menu
  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const prevent = (e: Event) => e.preventDefault();
    el.addEventListener("contextmenu", prevent);
    return () => el.removeEventListener("contextmenu", prevent);
  }, []);

  return {
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture: onLostCapture,
  } as const;
}
