"use client";

import { useState, useEffect } from "react";
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
import { ArrowRight, Users, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { playFeedbackSound } from "@/hooks/use-sound-feedback";

interface Table {
  id: string;
  number: number;
  name: string;
  seats: number;
  section: string;
  orders: { id: string; status: string; items: { id: string }[] }[];
}

interface TableMergeDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sourceTableId: string | null;
  tables: Table[];
  onMerged: () => void;
}

export function TableMergeDialog({
  open,
  onOpenChange,
  sourceTableId,
  tables,
  onMerged,
}: TableMergeDialogProps) {
  const [targetTableId, setTargetTableId] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

  const sourceTable = tables.find((t) => t.id === sourceTableId);
  const sourceOrder = sourceTable?.orders.find((o) => o.status === "open");
  const sourceItems = sourceOrder?.items.length || 0;

  // Filter: samo mize z odprtim naročilom ali proste mize (ne source)
  const availableTargets = tables.filter((t) => {
    if (t.id === sourceTableId) return false;
    const hasOpen = t.orders.some((o) => o.status === "open");
    return true; // dovolimo vse mize razen source
  });

  useEffect(() => {
    if (open) setTargetTableId(null);
  }, [open]);

  async function merge() {
    if (!sourceTableId || !targetTableId) return;
    setMerging(true);
    try {
      const res = await fetch("/api/tables/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceTableId, targetTableId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Napaka");

      playFeedbackSound("success");
      toast.success(data.message, {
        description: `${data.transferredItems} postavk prenesenih`,
        duration: 4000,
      });
      onMerged();
      onOpenChange(false);
    } catch (e) {
      playFeedbackSound("error");
      toast.error(e instanceof Error ? e.message : "Napaka pri združevanju");
    } finally {
      setMerging(false);
    }
  }

  if (!sourceTable) return null;

  const targetTable = tables.find((t) => t.id === targetTableId);
  const targetHasOrder = targetTable?.orders.some((o) => o.status === "open");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-amber-600" />
            Združi mizi
          </DialogTitle>
          <DialogDescription>
            Prenesi naročilo iz ene mize na drugo (npr. gostje so se preselili)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Source table */}
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
            <p className="text-xs text-muted-foreground">Iz mize (z naročilom)</p>
            <div className="mt-1 flex items-center justify-between">
              <div>
                <p className="font-semibold">{sourceTable.name}</p>
                <p className="text-xs text-muted-foreground">
                  {sourceTable.seats} sedišč · {sourceTable.section}
                </p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                {sourceItems} postavk
              </Badge>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowRight className="h-6 w-6 rotate-90 text-muted-foreground" />
          </div>

          {/* Target table selection */}
          <div>
            <p className="mb-2 text-sm font-medium">Na mizo:</p>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {availableTargets.map((t) => {
                const hasOrder = t.orders.some((o) => o.status === "open");
                const isSelected = targetTableId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTargetTableId(t.id)}
                    className={cn(
                      "rounded-lg border-2 p-2 text-left transition-all",
                      isSelected
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    <p className="text-sm font-medium">#{t.number} {t.name}</p>
                    <p className="text-[10px] text-muted-foreground">{t.seats} sedišč</p>
                    {hasOrder && (
                      <Badge variant="outline" className="mt-1 text-[9px] border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
                        Ima naročilo
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Warning */}
          {targetTable && targetHasOrder && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Ciljna miza že ima naročilo — postavke bodo dodane k obstoječemu naročilu.
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={merging}>
            Prekliči
          </Button>
          <Button
            onClick={merge}
            disabled={merging || !targetTableId}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {merging ? "Združujem..." : "Združi mizi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
