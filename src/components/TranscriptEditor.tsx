
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";

interface TranscriptEditorProps {
  transcript: string;
  onChange: (text: string) => void;
}

const TranscriptEditor = ({ transcript, onChange }: TranscriptEditorProps) => {
  const [editedTranscript, setEditedTranscript] = useState("");
  const [steps, setSteps] = useState<string[]>([]);

  useEffect(() => {
    setEditedTranscript(transcript);
  }, [transcript]);

  const handleTranscriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setEditedTranscript(newValue);
    onChange(newValue);
  };

  const createStep = () => {
    if (editedTranscript.trim()) {
      setSteps([...steps, editedTranscript.trim()]);
      setEditedTranscript("");
      onChange("");
    }
  };

  const handleStepChange = (index: number, newText: string) => {
    const newSteps = [...steps];
    newSteps[index] = newText;
    setSteps(newSteps);
  };

  const handleStepDelete = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4 border">
        <h3 className="text-lg font-medium mb-2">Current Transcript</h3>
        <Textarea
          value={editedTranscript}
          onChange={handleTranscriptChange}
          className="min-h-[100px] bg-gray-50"
          placeholder="Your recorded transcript will appear here. You can edit it before creating steps."
        />
        <div className="mt-2 flex justify-end">
          <Button onClick={createStep} disabled={!editedTranscript.trim()}>
            <Plus className="mr-1 h-4 w-4" /> Create Step
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-medium">Procedural Steps</h3>
        {steps.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
            <p className="text-muted-foreground">No steps created yet. Record and create your first step.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((step, index) => (
              <Card key={index} className="transition-all hover:shadow-md">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Step {index + 1}</h4>
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleStepDelete(index)}
                        className="text-xs h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={step}
                    onChange={(e) => handleStepChange(index, e.target.value)}
                    className="min-h-[80px]"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TranscriptEditor;
