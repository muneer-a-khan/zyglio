import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Copy, Download, RefreshCw, HelpCircle, Loader2 } from "lucide-react";
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
  initialYaml?: string;
  onChange?: (yaml: string) => void;
  onRegenerateYaml: (currentSteps: Step[], procedureName: string) => Promise<string | null>;
  isLoadingExternal?: boolean;
}

const YamlGenerator = ({
  steps,
  procedureName = "Untitled Procedure",
  initialYaml = "",
  onChange,
  onRegenerateYaml,
  isLoadingExternal
}: YamlGeneratorProps) => {
  const [yamlOutput, setYamlOutput] = useState<string>(initialYaml);
  const [isLocallyGenerating, setIsLocallyGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("preview");
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    console.log(`YamlGenerator received procedure name: "${procedureName}"`);
  }, [procedureName]);

  useEffect(() => {
    if (initialYaml) {
      setYamlOutput(initialYaml);
    } else if (steps.length > 0 && !initialYaml && activeTab === "preview") {
      generateYaml();
    }
  }, [initialYaml]);

  useEffect(() => {
    if (steps.length > 0 && yamlOutput === "" && !isLocallyGenerating && !isLoadingExternal && activeTab === "preview") {
      generateYaml();
    }
  }, [steps, procedureName, yamlOutput, isLocallyGenerating, isLoadingExternal, activeTab]);

  const generateYaml = async () => {
    if (!onRegenerateYaml) {
      toast.error("Regeneration function not provided.");
      return;
    }
    setIsLocallyGenerating(true);

    try {
      console.log(`Generating YAML with procedure name: "${procedureName}"`);
      const newYaml = await onRegenerateYaml(steps, procedureName);
      if (newYaml) {
        setYamlOutput(newYaml);
        if (onChange) {
          onChange(newYaml);
        }
        toast.success("YAML generated successfully.");
      } else {
        toast.error("Failed to generate YAML. Please try again.");
      }
    } catch (error) {
      console.error("Error generating YAML:", error);
      toast.error("Error generating YAML. Please try again.");
    } finally {
      setIsLocallyGenerating(false);
    }
  };

  const handleYamlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setYamlOutput(newValue);
    if (onChange) {
      onChange(newValue);
    }
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

  const isLoading = isLoadingExternal || isLocallyGenerating;
  const isEmpty = !yamlOutput && steps.length > 0;

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
            disabled={isLoading || steps.length === 0}
          >
            <RefreshCw
              className={`mr-1 h-4 w-4 ${
                isLoading ? "animate-spin" : ""
              }`}
            />
            {isLoading ? "Generating..." : "Regenerate"}
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
                {isLoading || isEmpty ? (
                  <div className="bg-gray-50 rounded-lg p-4 min-h-[400px] flex flex-col items-center justify-center">
                    {isLoading ? (
                      <>
                        <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
                        <h3 className="text-lg font-medium text-gray-700 mb-2">Generating YAML Schema</h3>
                        <p className="text-sm text-gray-500">
                          This may take a moment as we analyze your procedure steps...
                        </p>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-10 w-10 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-700 mb-2">No YAML Schema Yet</h3>
                        <p className="text-sm text-gray-500 mb-4">
                          Click the "Regenerate" button to create a YAML schema from your procedure steps.
                        </p>
                        <Button onClick={generateYaml} disabled={isLoading}>
                          Generate YAML
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
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
                )}
              </TabsContent>

              <TabsContent value="edit">
                <Textarea
                  value={yamlOutput}
                  onChange={handleYamlChange}
                  className="font-mono text-xs min-h-[400px]"
                  placeholder="YAML schema will appear here. You can edit it manually."
                  disabled={isLoading}
                />
                <div className="flex justify-end space-x-2 mt-2">
                  <Button variant="outline" size="sm" onClick={copyToClipboard} disabled={isLoading || !yamlOutput}>
                    {copySuccess ? "Copied" : "Copy to Clipboard"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadYaml} disabled={isLoading || !yamlOutput}>
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
