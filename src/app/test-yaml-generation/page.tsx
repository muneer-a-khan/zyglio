"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Wand2, Package, Target, Zap } from "lucide-react";
import { generateSimulationFromYaml } from "@/lib/yaml-to-simulation";
import { SimulationObject, SimulationScenario, SimulationTrigger } from "@/types/simulation";

const sampleYaml = `procedure_name: "Sample Medical Procedure"
purpose: "Demonstrate comprehensive step display with multiple decision points"

steps:
  - id: step_1
    title: "Patient Assessment"
    description: "Conduct initial patient evaluation and medical history review"
    next: step_2

  - id: step_2
    title: "Vital Signs Check"
    description: "Measure blood pressure, heart rate, temperature, and respiratory rate using monitoring equipment"
    decision_point: true
    options:
      - choice: "Normal vitals"
        next: step_3
        condition: "All vital signs within normal ranges"
      - choice: "Elevated blood pressure"
        next: step_4
        condition: "Systolic BP > 140 or diastolic BP > 90"

  - id: step_3
    title: "Standard Procedure Preparation"
    description: "Proceed with normal preparation protocol using sterile supplies"
    next: step_5

  - id: step_4
    title: "Emergency Protocol"
    description: "Implement emergency blood pressure reduction protocol"
    next: step_5

  - id: step_5
    title: "Equipment Setup"
    description: "Prepare all necessary medical equipment and instruments in sterile field"
    next: step_6

  - id: step_6
    title: "Documentation"
    description: "Complete all required documentation and reports"
    is_terminal: true

considerations:
  pre-operative:
    - "Verify patient identity and consent"
    - "Review medical history and allergies"
  intra-operative:
    - "Maintain sterile technique throughout"
    - "Monitor vital signs continuously"

goals:
  - "Complete procedure safely without complications"
  - "Maintain patient comfort throughout process"`;

export default function TestYamlGeneration() {
  const [yamlInput, setYamlInput] = useState(sampleYaml);
  const [generatedObjects, setGeneratedObjects] = useState<SimulationObject[]>([]);
  const [generatedScenarios, setGeneratedScenarios] = useState<SimulationScenario[]>([]);
  const [generatedTriggers, setGeneratedTriggers] = useState<SimulationTrigger[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    if (!yamlInput.trim()) return;

    setIsGenerating(true);
    try {
      const result = generateSimulationFromYaml(yamlInput);
      setGeneratedObjects(result.objects);
      setGeneratedScenarios(result.scenarios);
      setGeneratedTriggers(result.triggers);
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            YAML to Simulation Generator
          </h1>
          <p className="text-gray-600">
            Test the automatic generation of simulation objects, scenarios, and triggers from YAML procedure definitions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5" />
                  YAML Input
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={yamlInput}
                  onChange={(e) => setYamlInput(e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                  placeholder="Enter your YAML procedure definition here..."
                />
                <div className="mt-4 flex justify-between items-center">
                  <Button 
                    onClick={() => setYamlInput(sampleYaml)}
                    variant="outline"
                    size="sm"
                  >
                    Load Sample YAML
                  </Button>
                  <Button 
                    onClick={handleGenerate}
                    disabled={isGenerating || !yamlInput.trim()}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isGenerating ? "Generating..." : "Generate Simulation Elements"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Objects</p>
                    <p className="text-2xl font-bold">{generatedObjects.length}</p>
                  </div>
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Scenarios</p>
                    <p className="text-2xl font-bold">{generatedScenarios.length}</p>
                  </div>
                  <Target className="w-6 h-6 text-green-600" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Triggers</p>
                    <p className="text-2xl font-bold">{generatedTriggers.length}</p>
                  </div>
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
              </Card>
            </div>

            {/* Generated Objects */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  Generated Objects ({generatedObjects.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {generatedObjects.map((obj) => (
                    <div key={obj.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{obj.name}</h4>
                        <Badge variant="secondary">{obj.type}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{obj.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {obj.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                  {generatedObjects.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No objects generated yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Generated Scenarios */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-600" />
                  Generated Scenarios ({generatedScenarios.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {generatedScenarios.map((scenario) => (
                    <div key={scenario.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{scenario.name}</h4>
                        <Badge variant="secondary">{scenario.difficulty}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{scenario.description}</p>
                      <div className="text-xs text-gray-500">
                        Duration: {scenario.estimatedDuration} min
                      </div>
                    </div>
                  ))}
                  {generatedScenarios.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No scenarios generated yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Generated Triggers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-600" />
                  Generated Triggers ({generatedTriggers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {generatedTriggers.map((trigger) => (
                    <div key={trigger.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{trigger.name}</h4>
                        <Badge variant="secondary">{trigger.priority}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{trigger.description}</p>
                      <div className="text-xs text-gray-500">
                        Type: {trigger.type} | Actions: {trigger.actions.length}
                      </div>
                    </div>
                  ))}
                  {generatedTriggers.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No triggers generated yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 