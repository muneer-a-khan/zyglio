"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { useState } from "react";

// Mock data for demonstration
const mockProcedures = [
  {
    id: "1",
    title: "Central Line Insertion",
    description: "Standard procedure for central venous catheter placement",
    author: "Dr. Jane Smith",
    createdAt: "2025-04-15",
    steps: 12
  },
  {
    id: "2",
    title: "Endotracheal Intubation",
    description: "Airway management procedure for ventilation",
    author: "Dr. John Doe",
    createdAt: "2025-04-10",
    steps: 8
  },
  {
    id: "3",
    title: "IV Cannulation",
    description: "Peripheral intravenous access placement",
    author: "Nurse Robert Johnson",
    createdAt: "2025-04-05",
    steps: 6
  }
];

export default function ProcedureLibrary() {
  const [searchTerm, setSearchTerm] = useState("");
  const [procedures, setProcedures] = useState(mockProcedures);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (searchTerm) {
      const filteredProcedures = mockProcedures.filter(procedure => 
        procedure.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        procedure.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setProcedures(filteredProcedures);
    } else {
      setProcedures(mockProcedures);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
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
              <span className="text-lg font-semibold">VoiceProc</span>
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/procedures" className="text-sm font-medium hover:underline">
              Procedures
            </Link>
            <Link href="/media" className="text-sm font-medium hover:underline">
              Media Library
            </Link>
            <Link href="/create" className="text-sm font-medium hover:underline">
              Create
            </Link>
          </nav>
          <div>
            <Button variant="default">Sign In</Button>
          </div>
        </div>
      </header>
      
      <main className="flex-1 py-6">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Procedural Library</h1>
              <p className="text-gray-500 mt-1">Browse and learn from standardized procedures</p>
            </div>
            <div className="mt-4 md:mt-0 flex gap-4">
              <form onSubmit={handleSearch} className="flex w-full md:w-auto items-center space-x-2">
                <Input
                  type="search"
                  placeholder="Search procedures..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="md:w-[300px]"
                />
                <Button type="submit">Search</Button>
              </form>
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href="/create">New Procedure</Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {procedures.map((procedure) => (
              <Card key={procedure.id} className="overflow-hidden">
                <CardHeader className="bg-gray-50 border-b">
                  <CardTitle className="text-xl">{procedure.title}</CardTitle>
                  <CardDescription>{procedure.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Author:</span>
                      <span className="font-medium">{procedure.author}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Created:</span>
                      <span>{procedure.createdAt}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Steps:</span>
                      <span>{procedure.steps}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-4">
                  <Button variant="outline" size="sm">Preview</Button>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          
          {procedures.length === 0 && (
            <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed">
              <p className="text-muted-foreground">No procedures found matching your search</p>
              <Button 
                variant="link" 
                onClick={() => setProcedures(mockProcedures)}
                className="mt-2"
              >
                Reset search
              </Button>
            </div>
          )}
        </div>
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
              <span className="text-lg font-semibold">VoiceProc</span>
            </div>
            <p className="text-sm text-gray-500">
              © 2025 VoiceProc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
} 