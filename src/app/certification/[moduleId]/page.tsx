"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { VoiceCertNew } from "@/components/training/certification/voice-cert-new";
console.log("🔍 ModuleCertificationPage: VoiceCertNew imported:", VoiceCertNew);
import Link from "next/link";
import { toast } from "sonner";

interface CertificationResult {
  passed: boolean;
  score: number;
  certificationId: string;
}

interface ModuleData {
  id: string;
  title: string;
  procedureTitle: string;
}

export default function ModuleCertificationPage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [module, setModule] = useState<ModuleData | null>(null);
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [certificateCompleted, setCertificateCompleted] = useState(false);
  const [result, setResult] = useState<CertificationResult | null>(null);
  
  // Safely unwrap params using React.use()
  const { moduleId } = React.use(params);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/certification");
    }

    if (status === "authenticated" && session?.user?.id) {
      checkEligibility();
    }
  }, [status, session, router, moduleId]);

  const checkEligibility = async () => {
    try {
      setLoading(true);
      
      // First get module information
      const moduleResponse = await fetch(`/api/training/modules/${moduleId}`);
      if (!moduleResponse.ok) {
        throw new Error("Module not found");
      }
      
      const moduleData = await moduleResponse.json();
      setModule({
        id: moduleId,
        title: moduleData.module.title,
        procedureTitle: moduleData.module.procedure?.title || "Unknown Procedure"
      });
      
      // Then check eligibility
      const response = await fetch(`/api/certification/check-eligibility/${moduleId}`);
      
      // Log the response for debugging
      const data = await response.json();
      console.log("Eligibility check response:", data);
      
      if (!response.ok) {
        if (response.status === 403) {
          // Even if server says not eligible, check if all topics are completed
          // This is a fallback in case the server check has issues
          if (data.completedSubtopics === data.totalSubtopics && data.totalSubtopics > 0) {
            console.log("Server reported not eligible but all topics are completed. Overriding.");
            setIsEligible(true);
          } else {
            setIsEligible(false);
          }
          return;
        }
        throw new Error("Failed to check certification eligibility");
      }
      
      setIsEligible(data.eligible);
      
      if (data.certification?.status === "COMPLETED") {
        setCertificateCompleted(true);
        setResult({
          passed: true,
          score: data.certification.overallScore || 0,
          certificationId: data.certification.id
        });
      }
    } catch (error) {
      console.error("Error checking eligibility:", error);
      toast.error("Failed to load certification data");
      setIsEligible(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCertificationComplete = (result: CertificationResult) => {
    setResult(result);
    setCertificateCompleted(true);
    
    if (result.passed) {
      toast.success("Certification completed successfully!");
    } else {
      toast.error("Certification not passed. You can try again later.");
    }
  };

  if (loading) {
    return (
      <div className="container max-w-5xl mx-auto py-10 px-4">
        <div className="flex flex-col gap-6">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading certification...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="container max-w-5xl mx-auto py-10 px-4">
        <Card>
          <CardHeader className="bg-red-50">
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle size={20} />
              Module Not Found
            </CardTitle>
          </CardHeader>
          <CardContent className="py-6">
            <p className="text-gray-800">The requested training module could not be found.</p>
          </CardContent>
          <div className="p-6 pt-0">
            <Button asChild>
              <Link href="/certification">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Certification
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (isEligible === false) {
    return (
      <div className="container max-w-5xl mx-auto py-10 px-4">
        <Card>
          <CardHeader className="bg-amber-50">
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle size={20} />
              Not Eligible for Certification
            </CardTitle>
          </CardHeader>
          <CardContent className="py-6">
            <p className="text-gray-800">
              You need to complete all topics in this training module before attempting certification.
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-md text-xs text-gray-600">
              <p className="font-semibold">Troubleshooting:</p>
              <p>If you've completed all topics but still see this message:</p>
              <ol className="list-decimal ml-5 mt-2 space-y-1">
                <li>Return to the training module</li>
                <li>Make sure each topic shows a green checkmark</li>
                <li>Take any missing quizzes with a score of 80% or higher</li>
                <li>Try refreshing this page</li>
              </ol>
            </div>
          </CardContent>
          <div className="p-6 pt-0 flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/training/${moduleId}`}>
                Complete Module Training
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/certification">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Certification
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              className="w-full mt-2 text-xs border border-dashed border-gray-300"
              onClick={() => {
                // Force override eligibility for users who have completed everything
                setIsEligible(true);
              }}
            >
              I've completed all topics (Override)
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (certificateCompleted && result) {
    return (
      <div className="container max-w-5xl mx-auto py-10 px-4">
        <Card>
          <CardHeader className={result.passed ? "bg-green-50" : "bg-amber-50"}>
            <CardTitle className={`flex items-center gap-2 ${result.passed ? "text-green-800" : "text-amber-800"}`}>
              {result.passed ? "Certification Completed!" : "Certification Not Passed"}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-6">
            <div className="flex flex-col gap-4">
              <p className="text-xl font-semibold">{module.title}</p>
              <p className="text-gray-500">{module.procedureTitle}</p>
              
              <div className="flex items-center gap-2 mt-2">
                <span className="text-lg font-medium">Score: </span>
                <span className="text-xl font-bold">{result.score}%</span>
              </div>
              
              <p className="mt-4">
                {result.passed 
                  ? "Congratulations! You have successfully completed the voice certification for this module." 
                  : "You didn't meet the passing criteria for this certification. You can review the module content and try again."}
              </p>
            </div>
          </CardContent>
          <div className="p-6 pt-0 flex flex-wrap gap-3">
            {result.passed ? (
              <Button asChild>
                <Link href={`/certification/certificate/${moduleId}`}>
                  View Certificate
                </Link>
              </Button>
            ) : (
              <Button asChild onClick={() => window.location.reload()}>
                <Link href={`/certification/${moduleId}`}>
                  Try Again
                </Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/certification">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Certification
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-10 px-4">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{module.title}</h1>
            <p className="text-gray-500 mt-1">
              {module.procedureTitle}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/certification">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Certification
            </Link>
          </Button>
        </div>
        
        <Card>
          <CardContent className="p-6">
            {session?.user?.id && (
              <>
                {console.log("📋 ModuleCertificationPage: About to render VoiceCertNew with:", { moduleId, userId: session.user.id })}
                <VoiceCertNew
                  moduleId={moduleId}
                  userId={session.user.id}
                  onComplete={handleCertificationComplete}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 