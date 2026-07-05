"use client";

import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import { useSoundFeedback } from "@/hooks/use-sound-feedback";
import { toast } from "sonner";

export function SoundToggle() {
  const { enabled, toggle, play } = useSoundFeedback();

  function handleClick() {
    toggle();
    // Predvajaj testni zvok ob vklopu
    if (!enabled) {
      setTimeout(() => play("info"), 100);
    }
    toast.success(enabled ? "Zvoki izklopljeni" : "Zvoki vklopljeni", {
      description: enabled
        ? "Ne boš slišal zvočnih obvestil."
        : "Poslušaj: success, info, warning, kitchen, error.",
      duration: 2000,
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon" aria-label="Akcija"
      className="h-8 w-8"
      onClick={handleClick}
      title={enabled ? "Izklopi zvoke" : "Vklopi zvoke"}
    >
      {enabled ? (
        <Volume2 className="h-4 w-4" />
      ) : (
        <VolumeX className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  );
}
