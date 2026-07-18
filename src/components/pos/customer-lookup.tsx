"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { UserSearch, X, UserPlus, Phone, Mail, Star, Loader2 } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { playFeedbackSound } from "@/hooks/use-sound-feedback";

interface CustomerResult {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  points: number;
  totalSpent: number;
  visitCount: number;
  note: string | null;
  createdAt: string;
}

interface CustomerLookupProps {
  selectedCustomerId: string | null;
  onSelect: (customer: CustomerResult | null) => void;
}

export function CustomerLookup({ selectedCustomerId, onSelect }: CustomerLookupProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<CustomerResult | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load selected customer details
  useEffect(() => {
    if (selectedCustomerId) {
      fetch(`/api/customers/${selectedCustomerId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d && d.name) setSelected(d);
        })
        .catch(() => {});
    } else {
      setSelected(null);
    }
  }, [selectedCustomerId]);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/customers/search?q=${encodeURIComponent(query.trim())}&limit=8`)
        .then((r) => r.json())
        .then((d) => {
          setResults(d.results || []);
          setShowResults(true);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectCustomer(c: CustomerResult) {
    setSelected(c);
    setQuery("");
    setShowResults(false);
    onSelect(c);
    toast.success(`Stranka povezana: ${c.name}`, {
      description: `${c.visitCount} obiskov · ${formatEUR(c.totalSpent)} porabe · ${c.points} točk`,
      duration: 3000,
    });
  }

  function clearSelection() {
    setSelected(null);
    onSelect(null);
    setQuery("");
    inputRef.current?.focus();
  }

  // Če je stranka izbrana, prikaži njen info
  if (selected) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 dark:border-amber-800 dark:bg-amber-950/30">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-800 dark:bg-amber-900 dark:text-amber-300">
          {selected.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">{selected.name}</p>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
              {selected.points}t
            </span>
            <span>·</span>
            <span>{selected.visitCount}× obiskov</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={clearSelection}
          title="Odstrani stranko"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <UserSearch className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Poišči stranko..."
          className="h-9 w-44 rounded-lg border border-border bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {loading && (
          <div className="absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin rounded-full border-2 border-muted border-t-foreground" />
        )}
      </div>

      {/* Rezultati iskanja */}
      {showResults && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-72 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          <div className="max-h-80 overflow-y-auto">
            {results.map((c) => (
              <button
                key={c.id}
                onClick={() => selectCustomer(c)}
                className="flex w-full items-center gap-2 border-b border-border/40 p-2 text-left transition-colors last:border-0 hover:bg-muted/50"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-xs font-bold text-white">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                    {c.phone && (
                      <span className="flex items-center gap-0.5">
                        <Phone className="h-2.5 w-2.5" />
                        {c.phone}
                      </span>
                    )}
                    {c.email && (
                      <span className="flex items-center gap-0.5 truncate">
                        <Mail className="h-2.5 w-2.5" />
                        <span className="truncate">{c.email}</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <Badge variant="outline" className="text-[9px]">
                    {c.visitCount}×
                  </Badge>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {formatEUR(c.totalSpent)}
                  </p>
                </div>
              </button>
            ))}
          </div>
          <div className="border-t border-border bg-muted/30 p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                setShowResults(false);
                setQuickAddOpen(true);
              }}
            >
              <UserPlus className="mr-1.5 h-3 w-3" />
              Ni najdena? Dodaj novo stranko
            </Button>
          </div>
        </div>
      )}

      {/* No results */}
      {showResults && query.length >= 2 && !loading && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-72 rounded-lg border border-border bg-popover shadow-lg">
          <div className="p-4 text-center text-sm text-muted-foreground">
            <UserSearch className="mx-auto mb-1 h-6 w-6 opacity-40" />
            Ni najdenih strank za &ldquo;{query}&rdquo;
          </div>
        </div>
      )}

      {/* Quick-add dialog */}
      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-amber-600" />
              Hitra registracija stranke
            </DialogTitle>
            <DialogDescription>
              Dodaj stranko brez navigacije — takoj poveži z naročilom
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Ime in priimek *</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Janez Novak"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && quickAddCustomer()}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Telefon</label>
              <Input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="031 234 567"
                onKeyDown={(e) => e.key === "Enter" && quickAddCustomer()}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="janez@email.si"
                onKeyDown={(e) => e.key === "Enter" && quickAddCustomer()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickAddOpen(false)} disabled={adding}>
              Prekliči
            </Button>
            <Button
              onClick={quickAddCustomer}
              disabled={adding || !newName.trim()}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {adding ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <UserPlus className="mr-1.5 h-4 w-4" />}
              Dodaj in poveži
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  async function quickAddCustomer() {
    if (!newName.trim()) {
      toast.error("Ime je obvezno");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          phone: newPhone.trim() || undefined,
          email: newEmail.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Napaka");

      playFeedbackSound("success");
      toast.success(`Stranka dodana: ${data.name}`, {
        description: "Samodejno povezana z naročilom",
        duration: 3000,
      });

      // Samodejno izberi novo stranko
      onSelect({
        id: data.id,
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        points: data.points || 0,
        totalSpent: data.totalSpent || 0,
        visitCount: data.visitCount || 0,
      });

      // Počisti in zapri
      setNewName("");
      setNewPhone("");
      setNewEmail("");
      setQuickAddOpen(false);
      setQuery("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Napaka pri dodajanju stranke");
    } finally {
      setAdding(false);
    }
  }
}
