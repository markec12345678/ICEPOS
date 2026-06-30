"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sparkles,
  Image as ImageIcon,
  Loader2,
  Upload,
  Check,
  X,
} from "lucide-react";
import { formatEUR, type MenuItem } from "@/lib/types";
import { authHeaders } from "@/components/pos/pin-login";

export function ImageManager({
  menuItems,
  onUpdated,
}: {
  menuItems: MenuItem[];
  onUpdated: () => void;
}) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  async function generateImage(itemId: string, name: string) {
    setGenerating(itemId);
    try {
      const res = await fetch(`/api/menu/${itemId}/generate-image`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Napaka");
        return;
      }
      toast.success(`Slika za "${name}" generirana`);
      onUpdated();
    } catch {
      toast.error("Napaka pri generiranju");
    } finally {
      setGenerating(null);
    }
  }

  async function generateBatch() {
    setBatchLoading(true);
    try {
      const res = await fetch("/api/menu/generate-all-images", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ limit: 5 }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Napaka");
        return;
      }
      toast.success(data.message || `Generiranih ${data.generated} slik`);
      onUpdated();
    } catch {
      toast.error("Napaka pri batch generiranju");
    } finally {
      setBatchLoading(false);
    }
  }

  async function handleUpload(itemId: string, file: File) {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch(`/api/menu/${itemId}/upload-image`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ base64 }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Napaka");
          return;
        }
        toast.success("Slika naložena");
        onUpdated();
      } catch {
        toast.error("Napaka pri nalaganju");
      }
    };
    reader.readAsDataURL(file);
  }

  const itemsWithoutImage = menuItems.filter((m) => !m.imageUrl);
  const itemsWithImage = menuItems.filter((m) => m.imageUrl);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Slike jedi</h3>
          <p className="text-sm text-muted-foreground">
            {itemsWithImage.length}/{menuItems.length} postavk ima sliko · {itemsWithoutImage.length} manjka
          </p>
        </div>
        {itemsWithoutImage.length > 0 && (
          <Button onClick={generateBatch} disabled={batchLoading}>
            {batchLoading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-4 w-4" />
            )}
            {batchLoading ? "Generiram..." : "Generiraj 5 AI slik"}
          </Button>
        )}
      </div>

      {/* Grid of items */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className="overflow-hidden rounded-xl border bg-card"
          >
            {/* Image */}
            <div className="relative aspect-square bg-muted">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              {/* Generate button overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                <Button
                  size="sm"
                  onClick={() => generateImage(item.id, item.name)}
                  disabled={generating === item.id}
                >
                  {generating === item.id ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1 h-3 w-3" />
                  )}
                  {item.imageUrl ? "Ponovi" : "AI"}
                </Button>
              </div>
            </div>
            {/* Info */}
            <div className="p-2">
              <p className="truncate text-xs font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">{formatEUR(item.price)}</p>
              {item.imageUrl ? (
                <Badge variant="outline" className="mt-1 border-emerald-300 text-emerald-700 text-[10px] dark:border-emerald-800 dark:text-emerald-400">
                  <Check className="mr-0.5 h-2 w-2" />
                  Slika
                </Badge>
              ) : (
                <Badge variant="outline" className="mt-1 border-amber-300 text-amber-700 text-[10px] dark:border-amber-800 dark:text-amber-400">
                  <X className="mr-0.5 h-2 w-2" />
                  Manjka
                </Badge>
              )}
            </div>
            {/* Upload (hidden file input) */}
            <label className="flex cursor-pointer items-center justify-center border-t px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted">
              <Upload className="mr-1 h-2.5 w-2.5" />
              Naloži
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(item.id, f);
                }}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
