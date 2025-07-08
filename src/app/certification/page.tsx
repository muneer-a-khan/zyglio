"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Award, 
  CheckCircle2, 
  ChevronRight, 
  Clock, 
  FileText, 
  Mic, 
  ListCheck, 
  AlertTriangle
} from "lucide-react";
import Link from "next/link";

interface EligibleModule {
  id: string;
  title: string;
  procedureTitle: string;
  completedQuizzes: number;
  totalQuizzes: number;
  certificationStatus?: string;
  lastAttempt?: Date | null;
}

export default function CertificationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [eligibleModules, setEligibleModules] = useState<EligibleModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/certification");
    }

    if (status === "authenticated" && session?.user?.id) {
      fetchEligibleModules();
    }
  }, [status, session, router]);

  const fetchEligibleModules = async () => {
    try {
      setLoading(true);
      // Add cache-busting parameter to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/certification/eligible-modules?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to load eligible modules");
      }
      
      const data = await response.json();
      setEligibleModules(data.modules || []);
    } catch (err) {
      console.error("Error fetching eligible modules:", err);
      setError("Failed to load eligible modules. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (module: EligibleModule) => {
    switch (module.certificationStatus) {
      case "COMPLETED":
        return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">Certified</Badge>;
      case "FAILED":
        return <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200">Failed</Badge>;
      case "VOICE_INTERVIEW_IN_PROGRESS":
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-200">In Progress</Badge>;
      default:
        return module.completedQuizzes === module.totalQuizzes ? 
          <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-200">Ready for Certification</Badge> :
          <Badge variant="outline" className="bg-gray-100 text-gray-800">Quizzes Incomplete</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto py-10 px-4">
        <div className="flex flex-col gap-6">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading eligible modules...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-6xl mx-auto py-10 px-4">
        <Card>
          <CardHeader className="bg-red-50">
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle size={20} />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent className="py-6">
            <p className="text-gray-800">{error}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => fetchEligibleModules()}>Try Again</Button>
            <Button asChild variant="ghost" className="ml-2">
              <Link href="/training">Return to Training</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-10 px-4">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Voice Certification</h1>
            <p className="text-gray-500 mt-1">
              Complete voice interviews to get certified in modules you've studied
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => fetchEligibleModules()} variant="secondary">
              <Clock className="mr-2 h-4 w-4" />
              Refresh List
            </Button>
            <Button asChild variant="outline">
              <Link href="/training">
                <FileText className="mr-2 h-4 w-4" />
                Back to Training
              </Link>
            </Button>
          </div>
        </div>

        {eligibleModules.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Modules Available for Certification</CardTitle>
              <CardDescription>
                Complete all quizzes in a training module to unlock voice certification.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-col gap-4 text-sm">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <ListCheck size={18} className="text-blue-700" />
                  </div>
                  <div>
                    <h4 className="font-medium">Complete All Quizzes</h4>
                    <p className="text-gray-500 mt-1">
                      First, complete all quizzes in a training module with passing scores.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Mic size={18} className="text-blue-700" />
                  </div>
                  <div>
                    <h4 className="font-medium">Take Voice Interview</h4>
                    <p className="text-gray-500 mt-1">
                      Then, the module will appear here for voice certification.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild>
                <Link href="/training">Browse Training Modules</Link>
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {eligibleModules.map((module) => (
              <Card key={module.id} className="overflow-hidden">
                <CardHeader className="border-b bg-gray-50 pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{module.title}</CardTitle>
                    {getStatusBadge(module)}
                  </div>
                  <CardDescription>{module.procedureTitle}</CardDescription>
                </CardHeader>
                
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-green-600" />
                        <span>
                          {module.completedQuizzes}/{module.totalQuizzes} Quizzes Completed
                        </span>
                      </div>
                      
                      {module.lastAttempt && (
                        <div className="flex items-center gap-2 text-gray-500">
                          <Clock size={16} />
                          <span>
                            {new Date(module.lastAttempt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      {module.certificationStatus === "COMPLETED" ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <Award size={16} />
                          <span>You are certified in this module</span>
                        </div>
                      ) : module.completedQuizzes === module.totalQuizzes ? (
                        <p>Ready to take the voice certification interview</p>
                      ) : (
                        <p>Complete all quizzes to unlock certification</p>
                      )}
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="border-t bg-gray-50 pt-3">
                  {module.certificationStatus === "COMPLETED" ? (
                    <Button asChild variant="outline">
                      <Link href={`/certification/certificate/${module.id}`}>
                        View Certificate
                      </Link>
                    </Button>
                  ) : module.completedQuizzes === module.totalQuizzes ? (
                    <Button asChild>
                      <Link href={`/certification/${module.id}`}>
                        Start Voice Certification
                        <ChevronRight size={16} className="ml-2" />
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild variant="outline" disabled>
                      <Link href={`/training/${module.id}`}>
                        Complete All Quizzes First
                      </Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 