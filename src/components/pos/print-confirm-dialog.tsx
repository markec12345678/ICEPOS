"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PrintStatus } from "@/lib/print-utils";

interface PrintConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: PrintStatus;
  attempts: number;
  onRetry: () => void;
  invoiceNumber?: string;
}

const STATUS_CONFIG: Record<PrintStatus, { icon: React.ComponentType<{ className?: string }>; title: string; desc: string; color: string }> = {
  idle: { icon: Printer, title: "Pripravljen za tisk", desc: "Klikni za tiskanje", color: "text-muted-foreground" },
  preparing: { icon: Loader2, title: "Pripravljam...", desc: "Priprava računa za tiskanje", color: "text-amber-500" },
  printing: { icon: Printer, title: "Tiskam...", desc: "Počakaj da se tiskalnik natisne", color: "text-sky-500" },
  success: { icon: CheckCircle2, title: "Natisnjeno!", desc: "Račun je bil uspešno natisnjen", color: "text-emerald-500" },
  cancelled: { icon: XCircle, title: "Preklicano", desc: "Tiskanje je bilo preklicano", color: "text-rose-500" },
  error: { icon: AlertCircle, title: "Napaka pri tiskanju", desc: "Preveri povezavo s tiskalnikom", color: "text-rose-500" },
  retrying: { icon: RefreshCw, title: "Ponovno poskušam...", desc: "Avtomatski retry tiskanja", color: "text-amber-500" },
};

export function PrintConfirmDialog({
  open,
  onOpenChange,
  status,
  attempts,
  onRetry,
  invoiceNumber,
}: PrintConfirmDialogProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const isSpinning = status === "preparing" || status === "retrying" || status === "printing";
  const isError = status === "error" || status === "cancelled";
  const isSuccess = status === "success";

  // Auto-zapri po uspehu po 2 sekundah
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => onOpenChange(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={cn("h-5 w-5", config.color, isSpinning && "animate-spin")} />
            {config.title}
          </DialogTitle>
          <DialogDescription>{config.desc}</DialogDescription>
        </DialogHeader>

        {/* Status info */}
        <div className="space-y-2">
          {invoiceNumber && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Račun:</span>
              <span className="font-mono font-semibold">{invoiceNumber}</span>
            </div>
          )}
          {attempts > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Poskusi:</span>
              <Badge variant={isError ? "destructive" : "secondary"} className="text-[10px]">
                {attempts}×
              </Badge>
            </div>
          )}
        </div>

        {/* Error details */}
        {isError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950/20 dark:text-rose-400">
            <p className="font-semibold">Možne rešitve:</p>
            <ul className="mt-1 space-y-0.5">
              <li>• Preveri da je tiskalnik priključen in vklopljen</li>
              <li>• Preveri privzeti tiskalnik v brskalniku</li>
              <li>• Poskusi znova ali natisni kot PDF</li>
            </ul>
          </div>
        )}

        <DialogFooter>
          {isError && (
            <Button onClick={onRetry} className="gap-1.5">
              <RefreshCw className="h-4 w-4" />
              Poskusi znova
            </Button>
          )}
          {isSuccess && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Zapri
            </Button>
          )}
          {isSpinning && (
            <Button variant="outline" disabled>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              Čakam...
            </Button>
          )}
          {status === "idle" && (
            <Button onClick={onRetry} className="gap-1.5">
              <Printer className="h-4 w-4" />
              Natisni
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
