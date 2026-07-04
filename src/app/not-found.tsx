import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Home, Search } from "lucide-react";

/**
 * Next.js 404 stran — prikaže se kadar URL ne obstaja.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="max-w-md p-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/50">
          <Search className="h-8 w-8 text-amber-500" />
        </div>

        <h1 className="text-3xl font-bold text-foreground">404</h1>
        <p className="mt-2 text-sm font-medium text-foreground">
          Stran ni najdena
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Iskana stran ne obstaja ali je bila premaknjena.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <Button
            onClick={() => window.location.href = "/"}
            className="w-full bg-amber-600 hover:bg-amber-700"
          >
            <Home className="mr-2 h-4 w-4" />
            Nazaj na blagajno
          </Button>
        </div>
      </Card>
    </div>
  );
}
