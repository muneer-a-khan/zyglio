import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Copy, Download, RefreshCw, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Step {
  id: string;
  content: string;
  comments: string[];
}

interface YamlGeneratorProps {
  steps: Step[];
  procedureName: string;
}

const YamlGenerator = ({
  steps,
  procedureName = "Sample Procedure",
}: YamlGeneratorProps) => {
  const [yamlOutput, setYamlOutput] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("preview");
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (steps.length > 0) {
      generateYaml();
    }
  }, [steps, procedureName]);

  const generateYaml = () => {
    setIsGenerating(true);

    setTimeout(() => {
      try {
        const yaml = generateYamlFromSteps(steps, procedureName);
        setYamlOutput(yaml);
        setIsGenerating(false);
      } catch (error) {
        console.error("Error generating YAML:", error);
        toast.error("Failed to generate YAML schema");
        setIsGenerating(false);
      }
    }, 1000);
  };

  const generateYamlFromSteps = (steps: Step[], name: string): string => {
    // This is a simplified YAML generation function
    // In a real application, this would be more complex and robust

    let yaml = `# Procedure Definition\nname: "${name}"\nversion: "1.0"\ncreated_date: "${
      new Date().toISOString().split("T")[0]
    }"\n\n`;

    yaml += "steps:\n";

    steps.forEach((step, index) => {
      const stepNumber = index + 1;
      yaml += `  - id: "step-${stepNumber}"\n`;
      yaml += `    title: "Step ${stepNumber}"\n`;
      yaml += `    description: "${step.content.replace(/"/g, '\\"')}"\n`;

      // Add some conditional logic for demonstration
      if (index < steps.length - 1) {
        yaml += `    next: "step-${stepNumber + 1}"\n`;
      } else {
        yaml += `    next: "end"\n`;
      }

      // Add any comments as notes
      if (step.comments && step.comments.length > 0) {
        yaml += `    notes:\n`;
        step.comments.forEach((comment) => {
          yaml += `      - "${comment.replace(/"/g, '\\"')}"\n`;
        });
      }

      // Add some sample decision points for demonstration
      if (index === Math.floor(steps.length / 2) && steps.length > 2) {
        yaml += `    decision_point: true\n`;
        yaml += `    options:\n`;
        yaml += `      - choice: "Continue standard procedure"\n`;
        yaml += `        next: "step-${stepNumber + 1}"\n`;
        yaml += `      - choice: "Optional alternate path"\n`;
        yaml += `        next: "step-${stepNumber + 2}"\n`;
        yaml += `        condition: "if special circumstances present"\n`;
      }

      yaml += "\n";
    });

    // Add end state
    yaml += `  - id: "end"\n`;
    yaml += `    title: "Procedure Complete"\n`;
    yaml += `    description: "The procedure has been completed successfully."\n`;
    yaml += `    is_terminal: true\n`;

    return yaml;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(yamlOutput).then(
      () => {
        setCopySuccess(true);
        toast.success("YAML copied to clipboard");
        setTimeout(() => setCopySuccess(false), 2000);
      },
      () => {
        toast.error("Failed to copy YAML");
      }
    );
  };

  const downloadYaml = () => {
    const blob = new Blob([yamlOutput], { type: "text/yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${procedureName
      .replace(/\s+/g, "_")
      .toLowerCase()}_procedure.yaml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("YAML file downloaded");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center text-xl">
          YAML Schema Generator
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 ml-1">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  YAML schema defines the structure of your procedure, including
                  steps, decision points, and transition logic. It can be used
                  for automating procedures.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={generateYaml}
            disabled={isGenerating || steps.length === 0}
          >
            <RefreshCw
              className={`mr-1 h-4 w-4 ${isGenerating ? "animate-spin" : ""}`}
            />
            {isGenerating ? "Generating..." : "Regenerate"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {steps.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
            <p className="text-muted-foreground">
              Create procedure steps to generate YAML schema
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Tabs
              defaultValue="preview"
              value={activeTab}
              onValueChange={setActiveTab}
            >
              <TabsList className="mb-4">
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="edit">Edit</TabsTrigger>
              </TabsList>

              <TabsContent value="preview">
                <div className="bg-gray-50 rounded-lg p-4 relative">
                  <div className="absolute top-3 right-3 flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyToClipboard}
                    >
                      {copySuccess ? (
                        <>
                          <Check className="mr-1 h-4 w-4 text-green-500" />{" "}
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1 h-4 w-4" /> Copy
                        </>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadYaml}>
                      <Download className="mr-1 h-4 w-4" /> Download
                    </Button>
                  </div>
                  <pre className="text-xs overflow-auto max-h-[400px] pt-10 font-mono">
                    {yamlOutput}
                  </pre>
                </div>
              </TabsContent>

              <TabsContent value="edit">
                <Textarea
                  value={yamlOutput}
                  onChange={(e) => setYamlOutput(e.target.value)}
                  className="font-mono text-xs min-h-[400px]"
                  placeholder="YAML schema will appear here. You can edit it manually."
                />
                <div className="flex justify-end space-x-2 mt-2">
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    {copySuccess ? "Copied" : "Copy to Clipboard"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadYaml}>
                    Download
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default YamlGenerator;
