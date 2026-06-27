"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/stores/lang-store";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";

export function LangToggle() {
  const { lang, setLang } = useLang();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="h-9 gap-1 px-2" disabled>
        <Languages className="h-4 w-4" />
        SI
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-9 gap-1 px-2"
      onClick={() => setLang(lang === "sl" ? "en" : "sl")}
      title={lang === "sl" ? "Switch to English" : "Preklopi na slovenščino"}
    >
      <Languages className="h-4 w-4" />
      <span className={cn("font-semibold", lang === "sl" && "text-amber-600")}>
        SI
      </span>
      <span className="text-muted-foreground">/</span>
      <span className={cn("font-semibold", lang === "en" && "text-amber-600")}>
        EN
      </span>
    </Button>
  );
}
