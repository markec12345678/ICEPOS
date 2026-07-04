import { create } from "zustand";

export type Lang = "sl" | "en";

interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
  // t() je stub — i18n trenutno ni implementiran (UI je slovensko-only).
  // Za pravi i18n glej next-intl ali integracijo z ZAI prevajanjem.
  t: (key: string, params?: Record<string, string | number>) => string;
}

// Persist v localStorage
const STORAGE_KEY = "icepos-si-lang";

function loadLang(): Lang {
  if (typeof window === "undefined") return "sl";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "en" ? "en" : "sl";
}

export const useLang = create<LangState>((set, get) => ({
  lang: loadLang(),
  setLang: (l) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, l);
    }
    set({ lang: l });
  },
  // Stub — vrne key nazaj (UI je trenutno slovensko-only)
  t: (key) => key,
}));
