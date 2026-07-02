"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * Sound feedback sistem za POS.
 * - Uporablja Web Audio API (ni potrebnih audio datotek)
 * - Setting se shranjuje v localStorage
 * - 4 zvoki: success (plačilo), info (nov račun), warning (low stock), kitchen (recall)
 */

export type SoundType = "success" | "info" | "warning" | "kitchen" | "error";

const SOUND_ENABLED_KEY = "icepos_sound_enabled";

// Default: zvoki so vklopljeni
function getInitialEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = localStorage.getItem(SOUND_ENABLED_KEY);
    if (stored === null) return true;
    return stored === "true";
  } catch {
    return true;
  }
}

// Frekvence za različne tipe zvokov
const SOUND_PROFILES: Record<SoundType, { freqs: number[]; duration: number; type: OscillatorType }> = {
  success: { freqs: [523.25, 659.25, 783.99], duration: 0.3, type: "sine" }, // C-E-G akord
  info: { freqs: [659.25], duration: 0.15, type: "sine" }, // E ton
  warning: { freqs: [440, 440, 440], duration: 0.4, type: "square" }, // A ton 3x
  kitchen: { freqs: [880, 660, 880, 660], duration: 0.5, type: "triangle" }, // visok-nizek
  error: { freqs: [220, 185], duration: 0.4, type: "sawtooth" }, // nizka
};

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    // Resume če je suspended (avtopolitika browserjev)
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Predvaja zvok določenega tipa.
 */
export function playSound(type: SoundType, enabled: boolean = true): void {
  if (!enabled) return;

  const ctx = getAudioCtx();
  if (!ctx) return;

  const profile = SOUND_PROFILES[type];
  const noteDuration = profile.duration / profile.freqs.length;

  profile.freqs.forEach((freq, i) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.type = profile.type;
    oscillator.frequency.value = freq;

    const startTime = ctx.currentTime + i * noteDuration;
    const endTime = startTime + noteDuration;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, endTime);

    oscillator.start(startTime);
    oscillator.stop(endTime);
  });
}

/**
 * Hook za upravljanje sound feedback-a.
 */
export function useSoundFeedback() {
  const [enabled, setEnabled] = useState<boolean>(getInitialEnabled);

  useEffect(() => {
    try {
      localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
    } catch {
      // ignore
    }
  }, [enabled]);

  const play = useCallback(
    (type: SoundType) => {
      playSound(type, enabled);
    },
    [enabled]
  );

  const toggle = useCallback(() => {
    setEnabled((prev) => !prev);
  }, []);

  return { enabled, play, toggle, setEnabled };
}

/**
 * Prosti zvok (lahko kličeš kjerkoli, uporablja globalni enabled flag).
 */
export function playFeedbackSound(type: SoundType): void {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(SOUND_ENABLED_KEY);
    const enabled = stored === null ? true : stored === "true";
    playSound(type, enabled);
  } catch {
    // ignore
  }
}
