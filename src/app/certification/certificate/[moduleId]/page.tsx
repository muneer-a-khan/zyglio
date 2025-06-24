"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Award, CheckCircle2, AlertTriangle, Download, Share2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";

interface Certificate {
  id: string;
  userId: string;
  moduleId: string;
  moduleTitle: string;
  procedureTitle: string;
  score: number;
  certifiedAt: string;
  userName: string;
}

export default function CertificatePage({ params }: { params: { moduleId: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const certificateRef = useRef<HTMLDivElement>(null);
  
  // Safely unwrap params
  const moduleId = React.useMemo(() => params.moduleId, [params]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/certification");
    }

    if (status === "authenticated" && session?.user?.id) {
      fetchCertificate();
    }
  }, [status, session, router, moduleId]);

  const fetchCertificate = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/certification/certificate/${moduleId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError("Certificate not found. You may need to complete the certification first.");
          setLoading(false);
          return;
        }
        throw new Error("Failed to load certificate");
      }
      
      const data = await response.json();
      setCertificate(data.certificate);
    } catch (err) {
      console.error("Error fetching certificate:", err);
      setError("Failed to load certificate. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const downloadCertificate = () => {
    // In a full implementation, this would generate a PDF certificate
    // For now we'll just show a toast
    toast.info("Certificate download functionality will be implemented soon.");
  };

  const shareCertificate = () => {
    // In a full implementation, this would share the certificate
    // For now we'll just show a toast
    toast.info("Certificate sharing functionality will be implemented soon.");
  };

  if (loading) {
    return (
      <div className="container max-w-5xl mx-auto py-10 px-4">
        <div className="flex flex-col gap-6">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading certificate...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="container max-w-5xl mx-auto py-10 px-4">
        <Card>
          <CardHeader className="bg-red-50">
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle size={20} />
              Certificate Not Available
            </CardTitle>
          </CardHeader>
          <CardContent className="py-6">
            <p className="text-gray-800">{error || "Certificate not found. You may need to complete the certification first."}</p>
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

  return (
    <div className="container max-w-5xl mx-auto py-10 px-4">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Certificate</h1>
            <p className="text-gray-500 mt-1">
              {certificate.moduleTitle}
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
          <div className="p-8 relative overflow-hidden" ref={certificateRef}>
            {/* Certificate Border */}
            <div className="absolute inset-0 border-[12px] border-blue-100 m-4 pointer-events-none"></div>
            
            {/* Certificate Content */}
            <div className="relative z-10 pt-8 pb-10 px-6 text-center">
              <div className="flex justify-center mb-4">
                <Award size={64} className="text-blue-600" />
              </div>
              
              <h2 className="text-2xl font-bold mb-1">Certificate of Completion</h2>
              <p className="text-gray-500 mb-6">Voice Certification</p>
              
              <p className="text-lg mb-1">This certifies that</p>
              <h3 className="text-2xl font-bold mb-6">{certificate.userName || "User"}</h3>
              
              <p className="text-lg mb-1">has successfully completed</p>
              <h4 className="text-xl font-bold mb-1">{certificate.moduleTitle}</h4>
              <p className="text-gray-600 mb-6">{certificate.procedureTitle}</p>
              
              <div className="flex justify-center items-center gap-2 mb-6">
                <CheckCircle2 size={20} className="text-green-600" />
                <span className="font-semibold">Score: {certificate.score}%</span>
              </div>
              
              <p className="text-gray-500 mb-8">
                Issued on {format(new Date(certificate.certifiedAt), "MMMM d, yyyy")}
              </p>
              
              <div className="w-48 h-[2px] bg-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Zyglio Training System</p>
            </div>
          </div>
          
          <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
            <Button variant="outline" onClick={downloadCertificate}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button variant="outline" onClick={shareCertificate}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
} 