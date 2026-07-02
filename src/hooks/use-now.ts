"use client";

import { useEffect, useState } from "react";

/**
 * Hook, ki vsako sekundo posodobi "now" timestamp.
 * Uporabno za stoparice/timere v realnem času.
 */
export function useNow(intervalMs: number = 1000): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}

/**
 * Vrne elapsed time od podanega datuma v berljivi obliki.
 * Format: "1h 23m", "23m", "45s"
 */
export function formatElapsed(from: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(from).getTime();
  const totalSec = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Vrne elapsed time v MM:SS ali HH:MM:SS formatu.
 */
export function formatElapsedDigital(from: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(from).getTime();
  const totalSec = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const pad = (n: number) => String(n).padStart(2, "0");

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Vrne raven nujnosti glede na elapsed time.
 * - "normal": < 45 min
 * - "warning": 45-90 min
 * - "urgent": > 90 min
 */
export function getUrgencyLevel(
  from: Date,
  now: Date = new Date(),
  warningThresholdMin: number = 45,
  urgentThresholdMin: number = 90
): "normal" | "warning" | "urgent" {
  const diffMs = now.getTime() - new Date(from).getTime();
  const minutes = diffMs / 60000;

  if (minutes >= urgentThresholdMin) return "urgent";
  if (minutes >= warningThresholdMin) return "warning";
  return "normal";
}
