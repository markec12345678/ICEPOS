"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

const SHORTCUTS = [
  { key: "1", desc: "Mize" },
  { key: "2", desc: "Naročilo" },
  { key: "3", desc: "Računi" },
  { key: "4", desc: "Meni" },
  { key: "5", desc: "Pregled (Dashboard)" },
  { key: "Ctrl+K", desc: "Globalno iskanje" },
  { key: "Esc", desc: "Nazaj na mize / zapri dialog" },
  { key: "?", desc: "Prikaži to pomoč" },
];

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Ne reagiraj ko uporabnik tipka v input/textarea
      const target = e.target as HTMLElement;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) {
        return;
      }

      // ? prikaže help
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            Tipkovne bližnjice
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {SHORTCUTS.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between rounded-lg border p-2"
            >
              <span className="text-sm">{s.desc}</span>
              <kbd className="rounded border border-border bg-muted px-2 py-1 text-xs font-mono font-semibold shadow-sm">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
        <p className="pt-2 text-center text-xs text-muted-foreground">
          Pritisni <kbd className="rounded border bg-muted px-1 font-mono">?</kbd> kadarkoli za prikaz te pomoči.
        </p>
      </DialogContent>
    </Dialog>
  );
}
