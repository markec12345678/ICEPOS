"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bookmark, Plus, Trash2, Loader2, BookmarkPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { playFeedbackSound } from "@/hooks/use-sound-feedback";
import type { CartItem } from "@/lib/types";

const STORAGE_KEY = "icepos_order_templates";

export interface OrderTemplate {
  id: string;
  name: string;
  items: { menuItemId: string; menuItemName: string; quantity: number; note?: string }[];
  createdAt: string;
  useCount: number;
}

interface OrderTemplateManagerProps {
  cart: (CartItem & { lineId: string })[];
  onLoadTemplate: (items: OrderTemplate["items"]) => void;
}

function loadTemplates(): OrderTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OrderTemplate[];
  } catch {
    return [];
  }
}

function saveTemplates(templates: OrderTemplate[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function OrderTemplateManager({ cart, onLoadTemplate }: OrderTemplateManagerProps) {
  const [templates, setTemplates] = useState<OrderTemplate[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templateName, setTemplateName] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTemplates(loadTemplates());
  }, []);

  function saveTemplate() {
    if (!templateName.trim()) {
      toast.error("Vnesi ime predloge");
      return;
    }
    if (cart.length === 0) {
      toast.error("Košarica je prazna");
      return;
    }

    setSaving(true);
    try {
      const newTemplate: OrderTemplate = {
        id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: templateName.trim(),
        items: cart.map((c) => ({
          menuItemId: c.menuItem.id,
          menuItemName: c.menuItem.name,
          quantity: c.quantity,
          note: c.note || undefined,
        })),
        createdAt: new Date().toISOString(),
        useCount: 0,
      };

      const updated = [newTemplate, ...loadTemplates()].slice(0, 20); // max 20 predlog
      saveTemplates(updated);
      setTemplates(updated);
      playFeedbackSound("success");
      toast.success(`Predloga shranjena: ${newTemplate.name}`, {
        description: `${newTemplate.items.length} postavk`,
        duration: 2000,
      });
      setTemplateName("");
      setSaving(false);
    } catch {
      toast.error("Napaka pri shranjevanju predloge");
      setSaving(false);
    }
  }

  function loadTemplate(template: OrderTemplate) {
    onLoadTemplate(template.items);
    // Povečaj useCount
    const updated = loadTemplates().map((t) =>
      t.id === template.id ? { ...t, useCount: t.useCount + 1 } : t
    );
    saveTemplates(updated);
    setTemplates(updated);
    playFeedbackSound("info");
    toast.success(`Predloga naložena: ${template.name}`, {
      description: `${template.items.length} postavk dodanih`,
      duration: 2000,
    });
    setOpen(false);
  }

  function deleteTemplate(id: string) {
    const updated = loadTemplates().filter((t) => t.id !== id);
    saveTemplates(updated);
    setTemplates(updated);
    toast.info("Predloga izbrisana");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          title="Predloge naročil"
        >
          <Bookmark className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Predloge</span>
          {templates.length > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[9px]">
              {templates.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="space-y-3">
          {/* Save current cart as template */}
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold">
              <BookmarkPlus className="h-3.5 w-3.5 text-amber-600" />
              Shrani trenutno naročilo
            </p>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="npr. Poslovna kosila"
                maxLength={30}
                className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                onKeyDown={(e) => e.key === "Enter" && saveTemplate()}
              />
              <Button
                size="sm"
                className="h-8 shrink-0 bg-amber-600 hover:bg-amber-700"
                onClick={saveTemplate}
                disabled={saving || !templateName.trim() || cart.length === 0}
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              </Button>
            </div>
            {cart.length === 0 && (
              <p className="mt-1 text-[10px] text-muted-foreground">Košarica je prazna</p>
            )}
          </div>

          {/* Saved templates */}
          {templates.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Shranjene predloge
              </p>
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="group flex items-center gap-2 rounded-lg border border-border/60 p-2 transition-colors hover:bg-muted/30"
                  >
                    <button
                      onClick={() => loadTemplate(tpl)}
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      <Bookmark className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{tpl.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {tpl.items.length} postavk · {tpl.useCount}× uporabljeno
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => deleteTemplate(tpl.id)}
                      className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100"
                      title="Izbriši predlogo"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {templates.length === 0 && (
            <p className="py-2 text-center text-xs text-muted-foreground">
              Ni shranjenih predlog. Shrani trenutno naročilo za hitro ponovno uporabo.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
