"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hook za animirano štetje (count-up animation).
 * Uporabno za prikaz številk, ki se gladko animirajo od stare do nove vrednosti.
 *
 * @param value ciljna vrednost
 * @param duration trajanje animacije v ms (default 800)
 * @returns trenutna animirana vrednost
 */
export function useCountUp(value: number, duration: number = 800): number {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = previousValueRef.current;
    const endValue = value;
    const diff = endValue - startValue;

    // Če ni razlike, ne animiraj
    if (Math.abs(diff) < 0.01) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayValue(endValue);
      previousValueRef.current = endValue;
      return;
    }

    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // easeOutCubic za naravno gibanje
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + diff * eased;

      setDisplayValue(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        previousValueRef.current = endValue;
      }
    }

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [value, duration]);

  return displayValue;
}
