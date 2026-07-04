"use client";

import { useRef, useCallback } from "react";
import { toast } from "sonner";

/**
 * Hook za undo/redo kritičnih akcij.
 *
 * Namesto da destruktivne akcije (clearCart, delete, storno) takoj izvedemo,
 * najprej prikažemo toast z "Undo" gumbom in zakasnemo izvedbo za 5s.
 *
 * Če uporabnik klikne "Undo" v 5s, se akcija prekliče.
 * Če ne, se akcija izvede.
 *
 * Uporaba:
 *   const { confirmAction } = useUndo();
 *
 *   confirmAction({
 *     message: "Košarica počiščena",
 *     description: "10 postavk odstranjenih",
 *     onConfirm: () => clearCart(),
 *     onUndo: () => restoreCart(savedCart),
 *     undoLabel: "Obnovi",
 *   });
 */

interface UndoOptions {
  /** Toast naslov */
  message: string;
  /** Toast opis */
  description?: string;
  /** Akcija ki se izvede po timeout (destruktivna) */
  onConfirm: () => void | Promise<void>;
  /** Akcija za undo (obnovi) */
  onUndo?: () => void | Promise<void>;
  /** Label za undo gumb (default "Razveljavi") */
  undoLabel?: string;
  /** Timeout v ms (default 5000) */
  timeout?: number;
  /** Ali naj takoj izvede onConfirm in pokaže undo toast (default true)
   *  Če false, pričaka potrditev
   */
  immediate?: boolean;
}

export function useUndo() {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const undoneRef = useRef(false);

  const confirmAction = useCallback(
    ({
      message,
      description,
      onConfirm,
      onUndo,
      undoLabel = "Razveljavi",
      timeout = 5000,
      immediate = true,
    }: UndoOptions) => {
      undoneRef.current = false;

      if (immediate) {
        // Takoj izvedi destruktivno akcijo
        onConfirm();
      }

      // Prikaži toast z undo gumbom
      const toastId = toast(message, {
        description,
        duration: timeout,
        action: onUndo
          ? {
              label: undoLabel,
              onClick: () => {
                undoneRef.current = true;
                onUndo();
                toast.success("Akcija razveljavljena", { duration: 2000 });
              },
            }
          : undefined,
      });

      // Po timeout izvedi onConfirm (če ni immediate)
      if (!immediate) {
        timeoutRef.current = setTimeout(() => {
          if (!undoneRef.current) {
            onConfirm();
          }
        }, timeout);
      }

      return toastId;
    },
    []
  );

  /**
   * Prikaz potrditvenega toast-a (ne izvede ničesar — samo potrdi).
   * Uporabno za akcije ki so bile že izvedene in želimo pokazati rezultat.
   */
  const showUndoToast = useCallback(
    (
      message: string,
      description: string,
      onUndo: () => void | Promise<void>,
      undoLabel = "Razveljavi",
      timeout = 6000
    ) => {
      toast(message, {
        description,
        duration: timeout,
        action: {
          label: undoLabel,
          onClick: () => {
            onUndo();
            toast.success("Akcija razveljavljena", { duration: 2000 });
          },
        },
      });
    },
    []
  );

  /**
   * Prikaz opozorilnega toast-a z zahtevano potrditvijo.
   * Akcija se NE izvede dokler uporabnik ne klikne "Potrdi".
   */
  const confirmDestructive = useCallback(
    (
      message: string,
      description: string,
      onConfirm: () => void | Promise<void>,
      options?: {
        confirmLabel?: string;
        cancelLabel?: string;
        timeout?: number;
      }
    ) => {
      const {
        confirmLabel = "Potrdi",
        cancelLabel = "Prekliči",
        timeout = 10000,
      } = options || {};

      let confirmed = false;

      toast.warning(message, {
        description,
        duration: timeout,
        action: {
          label: confirmLabel,
          onClick: () => {
            confirmed = true;
            onConfirm();
          },
        },
        cancel: {
          label: cancelLabel,
          onClick: () => {
            // Nič — preklicano
          },
        },
      });

      return { isConfirmed: () => confirmed };
    },
    []
  );

  return {
    confirmAction,
    showUndoToast,
    confirmDestructive,
  };
}
