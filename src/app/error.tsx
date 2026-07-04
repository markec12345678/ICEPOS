"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, RefreshCw, Home, Bug } from "lucide-react";

/**
 * Next.js App Router error boundary.
 * Ta komponenta se prikaže kadar koli se aplikacija crashne.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error za debugging
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="max-w-md p-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/50">
          <AlertCircle className="h-8 w-8 text-rose-500" />
        </div>

        <h1 className="text-xl font-bold text-foreground">
          Prišlo je do napake
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Aplikacija je naletela na nepričakovano napako. Vaši podatki so varni.
        </p>

        {error?.message && (
          <div className="mt-4 rounded-lg bg-muted/50 p-3 text-left">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Bug className="h-3 w-3" />
              Tehnični podatki:
            </p>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                ID: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={reset} className="w-full bg-amber-600 hover:bg-amber-700">
            <RefreshCw className="mr-2 h-4 w-4" />
            Poskusi znova
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = "/"}
            className="w-full"
          >
            <Home className="mr-2 h-4 w-4" />
            Nazaj na začetek
          </Button>
        </div>

        <p className="mt-4 text-[10px] text-muted-foreground">
          Če se napaka ponavlja, kontaktirajte podporo s tehničnimi podatki zgoraj.
        </p>
      </Card>
    </div>
  );
}
