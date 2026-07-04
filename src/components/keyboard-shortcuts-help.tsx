"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard, Navigation, Zap, ShoppingCart } from "lucide-react";

const SHORTCUT_SECTIONS = [
  {
    title: "Navigacija",
    icon: Navigation,
    shortcuts: [
      { key: "1", desc: "Mize" },
      { key: "2", desc: "Naročilo" },
      { key: "3", desc: "Računi" },
      { key: "4", desc: "Meni" },
      { key: "5", desc: "Pregled (Dashboard)" },
      { key: "6", desc: "Kuhinja (KDS)" },
      { key: "7", desc: "Smena" },
      { key: "8", desc: "Zaloga" },
      { key: "9", desc: "Stranke" },
      { key: "0", desc: "Nastavitve" },
      { key: "Tab", desc: "Naslednja miza (v Mize)" },
      { key: "Esc", desc: "Nazaj na mize / zapri dialog" },
    ],
  },
  {
    title: "Naročilo in plačilo",
    icon: ShoppingCart,
    shortcuts: [
      { key: "F9 / P", desc: "Plačaj (odpri Payment dialog)" },
      { key: "Ctrl+Enter", desc: "Shrani naročilo" },
      { key: "Ctrl+S", desc: "Pošlji v kuhinjo" },
      { key: "Ctrl+D", desc: "Dodaj popust (ciklus 0→5→10→15→20%)" },
      { key: "Ctrl+Z", desc: "Počisti košarico" },
      { key: "+", desc: "Povečaj količino zadnje postavke" },
      { key: "-", desc: "Zmanjšaj/odstrani zadnjo postavko" },
      { key: "N", desc: "Nov račun (najdi prosto mizo)" },
      { key: "F2", desc: "Iskanje jedi (fokus na iskalnik)" },
    ],
  },
  {
    title: "Hitre akcije",
    icon: Zap,
    shortcuts: [
      { key: "Ctrl+K", desc: "Globalno iskanje" },
      { key: "F1 / ?", desc: "Prikaži to pomoč" },
    ],
  },
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

      // ? ali F1 prikaže help
      if (e.key === "?" || (e.shiftKey && e.key === "/") || e.key === "F1") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            Tipkovne bližnjice
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto">
          {SHORTCUT_SECTIONS.map((section) => {
            const SectionIcon = section.icon;
            return (
              <div key={section.title}>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <SectionIcon className="h-3.5 w-3.5" />
                  {section.title}
                </p>
                <div className="space-y-1">
                  {section.shortcuts.map((s) => (
                    <div
                      key={s.key}
                      className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-1.5"
                    >
                      <span className="text-sm text-foreground">{s.desc}</span>
                      <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-xs font-mono font-semibold shadow-sm">
                        {s.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <p className="pt-2 text-center text-xs text-muted-foreground">
          Pritisni <kbd className="rounded border bg-muted px-1 font-mono">?</kbd> ali <kbd className="rounded border bg-muted px-1 font-mono">F1</kbd> kadarkoli za prikaz te pomoči.
        </p>
      </DialogContent>
    </Dialog>
  );
}
