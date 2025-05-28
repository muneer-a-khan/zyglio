"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Get the code from the URL
        const code = searchParams?.get("code");
        
        if (!code) {
          setError("No confirmation code found in the URL.");
          setVerifying(false);
          return;
        }

        // Exchange the code for a session
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          setError(error.message);
          setVerifying(false);
          return;
        }

        // Successfully confirmed email
        setVerifying(false);
        
        // Wait a moment before redirecting
        setTimeout(() => {
          router.push("/auth/signin");
        }, 2000);
      } catch (err) {
        console.error("Error during email confirmation:", err);
        setError("An unexpected error occurred during email confirmation.");
        setVerifying(false);
      }
    };

    handleEmailConfirmation();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {verifying ? "Verifying your email..." : error ? "Verification Error" : "Email Verified"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          {verifying ? (
            <p>Please wait while we verify your email address...</p>
          ) : error ? (
            <>
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={() => router.push("/auth/register")}>
                Try Again
              </Button>
            </>
          ) : (
            <>
              <p className="text-green-600 mb-4">
                Your email has been successfully verified! You can now sign in.
              </p>
              <Button onClick={() => router.push("/auth/signin")}>
                Go to Sign In
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 