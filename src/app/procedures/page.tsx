"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, FileText, Plus, Calendar, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { procedureService, Procedure } from "@/lib/services";
import { format } from "date-fns";

export default function ProceduresPage() {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProcedures = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("Fetching procedures from API...");
        
        // Make direct API call for debugging
        const apiResponse = await fetch('/api/procedures');
        const apiData = await apiResponse.json();
        console.log("Direct API response:", apiData);
        
        // Use the service to get procedures
        const data = await procedureService.getAllProcedures();
        console.log(`Received ${data.length} procedures from API`, data);
        setProcedures(data);
      } catch (error) {
        console.error("Error loading procedures:", error);
        setError(error instanceof Error ? error.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    loadProcedures();
  }, []);

  const filteredProcedures = procedures.filter((procedure) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const titleMatch = procedure.title?.toLowerCase().includes(searchLower) || false;
    const descriptionMatch = procedure.description?.toLowerCase().includes(searchLower) || false;
    const presenterMatch = procedure.presenter?.toLowerCase().includes(searchLower) || false;
    
    const kpiTechMatch = Array.isArray(procedure.kpiTech) && 
      procedure.kpiTech.some((tag) => 
        typeof tag === 'string' && tag.toLowerCase().includes(searchLower)
      );
      
    const kpiConceptMatch = Array.isArray(procedure.kpiConcept) && 
      procedure.kpiConcept.some((tag) => 
        typeof tag === 'string' && tag.toLowerCase().includes(searchLower)
      );
    
    return titleMatch || descriptionMatch || presenterMatch || kpiTechMatch || kpiConceptMatch;
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is already handled by the filter above
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Loading procedures...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-500">Error: {error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="container py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Procedures</h1>
            <p className="text-gray-500">
              Browse our complete collection of voice-based procedural learning resources
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Showing {filteredProcedures.length} of {procedures.length} procedures
            </p>
          </div>
          
          <Link href="/create">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" /> Create New Procedure
            </Button>
          </Link>
        </div>
        
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex w-full max-w-sm items-center space-x-2">
            <Input
              type="search"
              placeholder="Search procedures..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button type="submit">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>

        {filteredProcedures.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No procedures found</h2>
            {searchTerm ? (
              <p className="text-gray-500">
                No procedures match your search criteria. Try different keywords.
              </p>
            ) : (
              <div>
                <p className="text-gray-500">
                  {procedures.length === 0 
                    ? "There are no procedures available yet. Create your first procedure."
                    : "No published procedures found. Your procedures might need to be configured with simulation settings."}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Total procedures in database: {procedures.length}
                </p>
              </div>
            )}
            <Link href="/create" className="mt-4 inline-block">
              <Button className="mt-4">Create New Procedure</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProcedures.map((procedure) => (
              <Card key={procedure.id} className="overflow-hidden flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">{procedure.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-gray-600 mb-4 line-clamp-3">{procedure.description}</p>
                  
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>{procedure.date ? new Date(procedure.date).toLocaleDateString() : "No date"}</span>
                  </div>
                  
                  {procedure.presenter && (
                    <div className="text-sm text-gray-500 mb-3">
                      <strong>Presenter:</strong> {procedure.presenter}
                      {procedure.affiliation && (
                        <span> ({procedure.affiliation})</span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-2 mt-3">
                    {procedure.kpiTech && procedure.kpiTech.map((tag, index) => (
                      <Badge key={`tech-${index}`} variant="secondary">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                    {procedure.kpiConcept && procedure.kpiConcept.map((tag, index) => (
                      <Badge key={`concept-${index}`} variant="outline">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="pt-3 border-t">
                  <Link href={`/procedures/${procedure.id}`} className="w-full">
                    <Button variant="default" className="w-full">
                      View Procedure
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="bg-gray-100 py-6">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center rounded-md bg-blue-600 h-8 w-8">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-white"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 11V9a2 2 0 0 0-2-2H8.5L3 3v18l5.5-4H17a2 2 0 0 0 2-2v-2" />
                  <path d="M15 9h6" />
                  <path d="M18 6v6" />
                </svg>
              </div>
              <span className="text-lg font-semibold">Zyglio</span>
            </div>
            <p className="text-sm text-gray-500">
              © 2025 Zyglio. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
} 