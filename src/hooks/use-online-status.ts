"use client";

import { useEffect, useState } from "react";

/**
 * Hook za zaznavanje online/offline stanja naprave.
 * Posluša 'online' in 'offline' dogodke ter prikaže toast ob spremembi.
 * Vrne true če je naprava online, false če offline.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOnline(navigator.onLine);

    function handleOnline() {
      setOnline(true);
    }

    function handleOffline() {
      setOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return online;
}
