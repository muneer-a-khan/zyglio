"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function AuthErrorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorType, setErrorType] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const error = searchParams?.get("error");
    if (error) {
      setErrorType(error);
      switch (error) {
        case "CredentialsSignin":
          setErrorMessage("Invalid email or password. Please try again.");
          break;
        case "AccessDenied":
          setErrorMessage("Access denied. You may not have permission to access this resource.");
          break;
        case "Verification":
          setErrorMessage("Email verification failed. Please try again or request a new verification email.");
          break;
        default:
          setErrorMessage("An authentication error occurred. Please try again.");
      }
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-red-600">
            Authentication Error
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-6">{errorMessage}</p>
          <div className="flex flex-col space-y-4">
            <Button 
              onClick={() => router.push("/auth/signin")}
              className="w-full"
            >
              Return to Sign In
            </Button>
            <Button 
              onClick={() => router.push("/auth/register")}
              variant="outline"
              className="w-full"
            >
              Register a New Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthErrorContent />
    </Suspense>
  );
} 