"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AlertTriangleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "destructive" gets a red confirm button and a warning icon — use for
   * delete/discard actions. "default" is a plain confirm with no icon. */
  variant?: "default" | "destructive";
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Replaces window.confirm() app-wide with a styled, themed modal. Renders
 * exactly one dialog instance; each useConfirm() call queues into the same
 * piece of state, so only ever one confirmation is visible at a time (the
 * same constraint window.confirm() itself had, just nicer to look at).
 * Mounted once per root layout — see admin/layout.tsx and
 * (storefront)/layout.tsx, since those are two independent React trees.
 */
export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setPending({ options, resolve });
    });
  }, []);

  function settle(result: boolean) {
    pending?.resolve(result);
    setPending(null);
  }

  const isDestructive = pending?.options.variant === "destructive";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={pending !== null} onOpenChange={(open) => !open && settle(false)}>
        {pending && (
          <DialogContent showCloseButton={false} className="sm:max-w-sm">
            <DialogHeader className="items-center text-center sm:items-center sm:text-center">
              {isDestructive && (
                <div className="bg-destructive/10 text-destructive mb-1 flex size-10 items-center justify-center rounded-full">
                  <AlertTriangleIcon className="size-5" />
                </div>
              )}
              <DialogTitle>{pending.options.title}</DialogTitle>
              {pending.options.description && (
                <DialogDescription>{pending.options.description}</DialogDescription>
              )}
            </DialogHeader>
            <DialogFooter className="sm:justify-center">
              <Button type="button" variant="outline" onClick={() => settle(false)}>
                {pending.options.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                type="button"
                variant={isDestructive ? "destructive" : "default"}
                onClick={() => settle(true)}
              >
                {pending.options.confirmLabel ?? "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </ConfirmContext.Provider>
  );
}

/** Returns an async confirm(options) function — resolves true/false instead of window.confirm()'s synchronous boolean. */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a ConfirmDialogProvider");
  }
  return ctx;
}
