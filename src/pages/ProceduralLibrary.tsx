
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const ProceduralLibrary = () => {
  // This is a placeholder for demonstration purposes
  // In a real application, this data would be fetched from a backend
  const procedures = [
    {
      id: 1,
      title: "Central Line Insertion",
      description: "Standard procedure for central venous catheter placement",
      author: "Dr. Jane Smith",
      createdAt: "2025-04-15",
      steps: 12
    },
    {
      id: 2,
      title: "Endotracheal Intubation",
      description: "Airway management procedure for ventilation",
      author: "Dr. John Doe",
      createdAt: "2025-04-10",
      steps: 8
    },
    {
      id: 3,
      title: "IV Cannulation",
      description: "Peripheral intravenous access placement",
      author: "Nurse Robert Johnson",
      createdAt: "2025-04-05",
      steps: 6
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 py-6">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Procedural Library</h1>
              <p className="text-gray-500 mt-1">Browse and learn from standardized procedures</p>
            </div>
            <div className="mt-4 md:mt-0 flex gap-4">
              <div className="relative">
                <Input 
                  placeholder="Search procedures..." 
                  className="pl-10 w-full md:w-[300px]" 
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <Button className="bg-medical-600 hover:bg-medical-700">
                New Procedure
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
                  <Button size="sm" className="bg-medical-600 hover:bg-medical-700">
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProceduralLibrary;
