"use client";

import { useEffect, useState } from "react";

/**
 * Debounce hook — zakasni posodobitev vrednosti za določeno število ms.
 *
 * Uporaba:
 *   const [search, setSearch] = useState("");
 *   const debouncedSearch = useDebounce(search, 300);
 *   // search se posodobi na vsak znak, debouncedSearch pa po 300ms tišine
 *
 * @param value vrednost za debounce
 * @param delay zakasnitev v ms (default 300)
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
