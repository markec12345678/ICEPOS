"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Euro, ChevronDown, Globe } from "lucide-react";
import { usePosStore } from "@/stores/pos-store";
import { CURRENCY_LABELS, type DisplayCurrency } from "@/lib/multi-currency";
import { toast } from "sonner";

const CURRENCIES: DisplayCurrency[] = ["EUR", "USD", "USD"];

export function CurrencyToggle() {
  const displayCurrency = usePosStore((s) => s.displayCurrency);
  const setDisplayCurrency = usePosStore((s) => s.setDisplayCurrency);

  function handleSelect(c: DisplayCurrency) {
    setDisplayCurrency(c);
    toast.success(`Prikaz valute: ${CURRENCY_LABELS[c]}`, {
      description:
        c === "EUR"
          ? "Cene so prikazane v EUR (osnovna valuta za FURS)."
          : `Cene bodo prikazane tudi v ${c} (računi se vedno izdajo v EUR).`,
      duration: 3000,
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2"
          title="Prikaz valute (turisti)"
        >
          <Globe className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">{displayCurrency}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="flex items-center gap-1.5">
          <Euro className="h-3.5 w-3.5" />
          Prikaz valute
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {CURRENCIES.map((c) => (
          <DropdownMenuItem
            key={c}
            onClick={() => handleSelect(c)}
            className="flex items-center justify-between"
          >
            <span>{CURRENCY_LABELS[c]}</span>
            {displayCurrency === c && (
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">✓</span>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <p className="px-2 py-1.5 text-[10px] leading-tight text-muted-foreground">
          💡 Računi se vedno izdajo v EUR (FURS zahteva). Prikaz v drugi valuti je informativne narave za turiste.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
