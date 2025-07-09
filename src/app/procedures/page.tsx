"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, FileText, Plus, Calendar, Tag, Lock, Copy, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { procedureService, Procedure } from "@/lib/services";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ProceduresPage() {
  const { data: session, status } = useSession();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingProcedure, setDeletingProcedure] = useState<string | null>(null);

  useEffect(() => {
    const loadProcedures = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("Fetching owned procedures from API...");
        
        // If user is not authenticated, don't load any procedures
        if (status === "unauthenticated") {
          setProcedures([]);
          setLoading(false);
          return;
        }
        
        // Wait for session to be loaded
        if (status === "loading") {
          return;
        }
        
        // Use the service to get only owned procedures
        const data = await procedureService.getOwnedProcedures();
        console.log(`Received ${data.length} owned procedures from API`, data);
        setProcedures(data);
      } catch (error) {
        console.error("Error loading procedures:", error);
        setError(error instanceof Error ? error.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    loadProcedures();
  }, [status]);

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

  const handleDeleteProcedure = async (procedureId: string, title: string) => {
    try {
      setDeletingProcedure(procedureId);
      await procedureService.deleteProcedure(procedureId);
      
      // Remove the procedure from the local state
      setProcedures(prev => prev.filter(p => p.id !== procedureId));
      
      toast.success(`"${title}" has been deleted successfully`);
    } catch (error) {
      console.error('Error deleting procedure:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete procedure');
    } finally {
      setDeletingProcedure(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Loading your procedures...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Lock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Sign In Required</h2>
          <p className="text-gray-500 mb-4">You need to sign in to view your procedures.</p>
          <Link href="/auth/signin">
            <Button>Sign In</Button>
          </Link>
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
            <h1 className="text-3xl font-bold mb-2">My Procedures</h1>
            <p className="text-gray-500">
              Manage and view your voice-based procedural learning resources
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Showing {filteredProcedures.length} of {procedures.length} procedures you've created
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
              placeholder="Search your procedures..."
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
                    ? "You haven't created any procedures yet. Create your first procedure to get started."
                    : "No procedures match your search. Try different keywords or create a new procedure."}
                </p>
                {procedures.length === 0 && (
                  <p className="text-sm text-gray-400 mt-2">
                    Procedures you create will appear here and will only be visible to you.
                  </p>
                )}
              </div>
            )}
            <Link href="/create" className="mt-4 inline-block">
              <Button className="mt-4">Create Your First Procedure</Button>
            </Link>
          </div>
        ) :
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
                  <div className="flex w-full gap-2">
                    <Link href={`/procedures/${procedure.id}`} className="flex-1">
                      <Button variant="default" className="w-full">
                        View Procedure
                      </Button>
                    </Link>
                    <Link href={`/procedures/clone/${procedure.id}`}>
                      <Button variant="outline" size="sm" className="flex items-center gap-1">
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={deletingProcedure === procedure.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Procedure</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{procedure.title}"? This action cannot be undone.
                            All associated data including steps, training modules, and certifications will be permanently removed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteProcedure(procedure.id!, procedure.title)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={deletingProcedure === procedure.id}
                          >
                            {deletingProcedure === procedure.id ? 'Deleting...' : 'Delete'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        }
      </main>
    </div>
  );
} 