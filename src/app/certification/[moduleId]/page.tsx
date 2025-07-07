"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, Loader2 } from "lucide-react";
import { ElevenLabsVoiceCertification } from "@/components/training/certification/elevenlabs-voice-certification";

interface CertificationModule {
  id: string;
  title: string;
  eligibile: boolean;
  completedQuizzes: number;
  totalQuizzes: number;
  progress: number;
}

interface ModuleCertificationPageProps {
  params: {
    moduleId: string;
  };
}

export default function ModuleCertificationPage({
  params: { moduleId },
}: ModuleCertificationPageProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [moduleData, setModuleData] = useState<CertificationModule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }
    checkEligibility();
  }, [session, status, moduleId]);

  const checkEligibility = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/certification/check-eligibility/${moduleId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError("Module not found");
        } else {
          setError("Failed to check certification eligibility");
        }
        return;
      }

      const data = await response.json();
      setModuleData(data);
      
      if (!data.eligible) {
        setError(`You need to complete ${data.totalQuizzes - data.completedQuizzes} more quiz(s) before you can take voice certification.`);
      }
    } catch (error) {
      console.error("Error checking eligibility:", error);
      setError("Failed to load certification information");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCertificationComplete = (results: any) => {
    console.log("Certification completed:", results);
    // Redirect to results page or training dashboard
    router.push("/training");
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-10 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading certification information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (error || !moduleData?.eligible) {
    return (
      <div className="container max-w-4xl mx-auto py-10 px-4">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              {error ? "Error" : "Not Eligible"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              {error || "You are not eligible for voice certification on this module."}
            </p>
            {moduleData && (
              <div className="text-sm text-gray-500">
                <p>Progress: {moduleData.completedQuizzes}/{moduleData.totalQuizzes} quizzes completed</p>
              </div>
            )}
            <div className="mt-4">
              <Button onClick={() => router.push("/training")} variant="outline">
                Go to Training
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-10 px-4">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Training
        </Button>
      </div>

      <ElevenLabsVoiceCertification
        moduleId={moduleId}
        userId={session.user.id}
        onCertificationComplete={handleCertificationComplete}
        className="w-full"
      />
    </div>
  );
} 