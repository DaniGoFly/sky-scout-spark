import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * /out?u=<encodedFinalUrl>
 *
 * This route is a thin client-side shim that forwards to the secure backend redirect,
 * which returns an HTTP 302 to the FINAL provider URL.
 */
export default function Out() {
  const [params] = useSearchParams();
  const u = params.get("u");

  useEffect(() => {
    if (!u) return;
    window.location.href = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/booking-redirect?u=${u}`;
  }, [u]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Redirecting…</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Taking you to the booking provider.
        </p>
        {!u && (
          <p className="text-sm text-destructive mt-4">
            Missing booking URL.
          </p>
        )}
      </div>
    </main>
  );
}
