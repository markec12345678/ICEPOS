"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Store, ChevronDown } from "lucide-react";
import { useTenantStore, type TenantInfo } from "@/stores/tenant-store";

export function TenantSelector() {
  const { current, list, setCurrent, loadList } = useTenantStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    if (list.length === 0) {
      loadList();
    }
  }, [list.length, loadList]);

  if (!mounted) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-1.5">
        <Store className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Nalagam...</span>
      </div>
    );
  }

  if (list.length === 0) {
    return null;
  }

  if (list.length === 1) {
    // Samo ena restavracija — ne prikazuj selectorja, ampak jo nastavi
    if (!current) setCurrent(list[0]);
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-1.5">
        <Store className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{list[0].name}</span>
      </div>
    );
  }

  return (
    <Select
      value={current?.id || list[0].id}
      onValueChange={(val) => {
        const found = list.find((r) => r.id === val);
        if (found) {
          setCurrent(found);
          // Reload da se API-ji klic-ejo z novim tenant-om
          window.location.reload();
        }
      }}
    >
      <SelectTrigger className="h-9 w-auto gap-2 border bg-muted/30 px-3">
        <Store className="h-4 w-4 text-primary" />
        <SelectValue placeholder="Izberi restavracijo" />
      </SelectTrigger>
      <SelectContent>
        {list.map((r: TenantInfo) => (
          <SelectItem key={r.id} value={r.id}>
            <div className="flex flex-col">
              <span className="font-medium">{r.name}</span>
              {r.city && (
                <span className="text-xs text-muted-foreground">{r.city}</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
