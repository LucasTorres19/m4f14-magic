"use client";
import { createContext, useContext, useRef, useState } from "react";

const LoginGateCtx = createContext<{
  open: ({
    onSuccess,
    onError,
  }: {
    onSuccess: () => void;
    onError: () => void;
  }) => void;
  close: () => void;
  isOpen: boolean;
  onSuccessRef: React.RefObject<(() => void) | null>;
  onErrorRef: React.RefObject<(() => void) | null>;
} | null>(null);
export function useLoginGateOpener() {
  // returns `openOnce: () => Promise<boolean>` from your provider
  const ctx = useContext(LoginGateCtx);
  if (!ctx) throw new Error("LoginGateProvider missing");
  return ctx; // this is the Promise<boolean> opener
}

export function LoginGateOpenerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setOpen] = useState(false);
  const onSuccessRef = useRef<() => void>(null);
  const onErrorRef = useRef<() => void>(null);

  const open = ({
    onSuccess,
    onError,
  }: {
    onSuccess: () => void;
    onError: () => void;
  }) => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    onSuccessRef.current = null;
    onErrorRef.current = null;
  };
  return (
    <LoginGateCtx.Provider
      value={{ open, isOpen: isOpen, onSuccessRef, onErrorRef, close }}
    >
      {children}
    </LoginGateCtx.Provider>
  );
}
