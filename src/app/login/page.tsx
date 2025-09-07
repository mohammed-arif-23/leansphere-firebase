"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { GraduationCap } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [regNo, setRegNo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = regNo.trim();
    if (!trimmed) {
      setError("Please enter your registration number.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationNumber: trimmed }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        setError(json?.error?.message || "Login failed. Please check your registration number.");
        setLoading(false);
        return;
      }

      // Cookie will be set by the API. Navigate to redirect destination.
      router.replace(redirectTo);
    } catch (err: any) {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }, [regNo, router, redirectTo]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <Card className="mx-auto max-w-md w-full">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <GraduationCap className="h-12 w-12 text-accent" />
          </div>
          <CardTitle className="text-2xl text-center">Login to dynamIT</CardTitle>
          <CardDescription className="text-center">
            Use your college registration number to sign in. We verify it with the IT Panel once, then create your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={onSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="regNo">Registration Number</Label>
              <Input
                id="regNo"
                value={regNo}
                onChange={(e) => setRegNo(e.target.value.toUpperCase())}
                placeholder="e.g., 602124205052"
                inputMode="text"
                autoComplete="username"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
              {loading ? "Verifying..." : "Login"}
            </Button>
            <Separator className="my-2" />
            <p className="text-xs text-muted-foreground text-center">
              By continuing, you agree to our terms and acknowledge the IT Panel registration check.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
