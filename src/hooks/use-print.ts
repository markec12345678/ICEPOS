"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { playFeedbackSound } from "@/hooks/use-sound-feedback";
import {
  printReceipt,
  type PrintStatus,
  type PrintOptions,
} from "@/lib/print-utils";

interface UsePrintResult {
  status: PrintStatus;
  printing: boolean;
  attempts: number;
  print: (options?: PrintOptions) => Promise<void>;
  printWithRetry: (options?: PrintOptions) => Promise<void>;
}

/**
 * Hook za robustno tiskanje z:
 * - Status tracking (idle, preparing, printing, success, cancelled, error, retrying)
 * - Auto-retry (do 3 poskusi)
 * - Sound feedback
 * - Toast obvestila
 * - Print queue (prepreči duplikate)
 */
export function usePrint(): UsePrintResult {
  const [status, setStatus] = useState<PrintStatus>("idle");
  const [attempts, setAttempts] = useState(0);
  const lastPrintRef = useRef<number>(0);
  const printRef = useRef<(options?: PrintOptions) => Promise<void>>(async () => {});

  const print = useCallback(async (options?: PrintOptions) => {
    // Prepreči hitro dvojno klikanje (debounce 500ms)
    const now = Date.now();
    if (now - lastPrintRef.current < 500) {
      return;
    }
    lastPrintRef.current = now;

    setStatus("preparing");
    setAttempts(0);

    try {
      const result = await printReceipt({
        maxRetries: 3,
        prepareDelay: 500,
        retryOnCancel: false,
        onStatus: (newStatus, attempt) => {
          setStatus(newStatus);
          setAttempts(attempt);
        },
        ...options,
      });

      if (result.status === "success") {
        playFeedbackSound("success");
        toast.success("Račun natisnjen", {
          description: result.attempts > 1 ? `Uspeh po ${result.attempts}. poskusu` : undefined,
          duration: 2000,
        });
        setStatus("success");
      } else if (result.status === "cancelled") {
        setStatus("cancelled");
        toast.info("Tiskanje preklicano", {
          description: "Račun ni bil natisnjen",
          duration: 2000,
        });
      } else {
        setStatus("error");
        playFeedbackSound("error");
        toast.error("Tiskanje ni uspelo", {
          description: result.error || `Po ${result.attempts} poskusih`,
          duration: 5000,
          action: {
            label: "Poskusi znova",
            onClick: () => printRef.current(options),
          },
        });
      }
    } catch {
      setStatus("error");
      playFeedbackSound("error");
      toast.error("Napaka pri tiskanju", {
        description: "Preverite povezavo s tiskalnikom",
        duration: 5000,
      });
    }
  }, []);

  // Update ref
  useEffect(() => {
    printRef.current = print;
  }, [print]);

  const printWithRetry = useCallback(async (options?: PrintOptions) => {
    await printReceipt({
      ...options,
      retryOnCancel: true,
      maxRetries: 5,
      onStatus: (newStatus, attempt) => {
        setStatus(newStatus);
        setAttempts(attempt);
      },
    });
  }, []);

  return {
    status,
    printing: status === "preparing" || status === "printing" || status === "retrying",
    attempts,
    print,
    printWithRetry,
  };
}
