"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  Edit, 
  Trash, 
  Play,
  Clock,
  Target,
  CheckCircle,
  AlertCircle,
  Info,
  X
} from "lucide-react";
import { toast } from "sonner";
import { SimulationScenario, SimulationObject, SimulationTrigger, ScenarioOutcome } from "@/types/simulation";
import { simulationEngine } from "@/lib/simulation-engine";
import { v4 as uuidv4 } from "uuid";

export interface ScenarioManagerProps {
  objects: SimulationObject[];
  scenarios: SimulationScenario[];
  onAddScenario: (scenario: SimulationScenario) => void;
  onUpdateScenario: (id: string, updatedScenario: SimulationScenario) => void;
  onDeleteScenario: (id: string) => void;
}

const DIFFICULTY_LEVELS = [
  { value: "beginner", label: "Beginner", color: "bg-green-100 text-green-800" },
  { value: "intermediate", label: "Intermediate", color: "bg-yellow-100 text-yellow-800" },
  { value: "advanced", label: "Advanced", color: "bg-red-100 text-red-800" },
];

const OUTCOME_TYPES = [
  { value: "success", label: "Success", icon: CheckCircle, color: "text-green-600" },
  { value: "failure", label: "Failure", icon: X, color: "text-red-600" },
  { value: "warning", label: "Warning", icon: AlertCircle, color: "text-yellow-600" },
  { value: "information", label: "Information", icon: Info, color: "text-blue-600" },
];

const ScenarioManager: React.FC<ScenarioManagerProps> = ({
  objects,
  scenarios,
  onAddScenario,
  onUpdateScenario,
  onDeleteScenario
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingScenario, setEditingScenario] = useState<SimulationScenario | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    objectives: "",
    difficulty: "beginner" as SimulationScenario['difficulty'],
    estimatedDuration: 30,
    objects: [] as string[],
    triggers: [] as string[],
    tags: "",
  });
  const [outcomes, setOutcomes] = useState<ScenarioOutcome[]>([]);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      objectives: "",
      difficulty: "beginner",
      estimatedDuration: 30,
      objects: [],
      triggers: [],
      tags: "",
    });
    setOutcomes([]);
    setIsCreating(false);
    setEditingScenario(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      // Parse objectives, outcomes and tags as arrays
      const objectives = formData.objectives.trim() ? formData.objectives.split("\n").map(o => o.trim()).filter(Boolean) : [];
      const tags = formData.tags.trim() ? formData.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
      const outcomes: ScenarioOutcome[] = []; // TODO: Add outcome parsing if needed

      const newScenario: SimulationScenario = {
        id: editingScenario?.id || uuidv4(),
        name: formData.name,
        description: formData.description,
        difficulty: formData.difficulty,
        estimatedDuration: formData.estimatedDuration,
        objectives,
        outcomes,
        objects: formData.objects,
        tags,
        triggers: [], // TODO: Add trigger handling if needed
        conditions: [], // TODO: Add condition handling if needed
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (editingScenario) {
        onUpdateScenario(editingScenario.id, newScenario);
      } else {
        onAddScenario(newScenario);
      }
      resetForm();
    } catch (error) {
      console.error("Error saving scenario:", error);
      toast.error("Failed to save scenario");
    }
  };

  const handleEdit = (scenario: SimulationScenario) => {
    setEditingScenario(scenario);
    setFormData({
      name: scenario.name,
      description: scenario.description,
      objectives: scenario.objectives.join("\n"),
      difficulty: scenario.difficulty,
      estimatedDuration: scenario.estimatedDuration,
      objects: scenario.objects,
      triggers: scenario.triggers,
      tags: scenario.tags.join(", "),
    });
    setOutcomes(scenario.outcomes);
    setIsCreating(true);
  };

  const handleDelete = async (scenarioId: string) => {
    if (!confirm("Are you sure you want to delete this scenario?")) return;

    try {
      const updatedScenarios = scenarios.filter(scenario => scenario.id !== scenarioId);
      onDeleteScenario(scenarioId);
      toast.success("Scenario deleted successfully");
    } catch (error) {
      console.error("Error deleting scenario:", error);
      toast.error("Failed to delete scenario");
    }
  };

  const addOutcome = () => {
    const newOutcome: ScenarioOutcome = {
      id: `outcome_${Date.now()}`,
      type: "success",
      title: "",
      description: "",
      feedback: "",
    };
    setOutcomes([...outcomes, newOutcome]);
  };

  const updateOutcome = (index: number, updates: Partial<ScenarioOutcome>) => {
    const updatedOutcomes = outcomes.map((outcome, i) => 
      i === index ? { ...outcome, ...updates } : outcome
    );
    setOutcomes(updatedOutcomes);
  };

  const removeOutcome = (index: number) => {
    setOutcomes(outcomes.filter((_, i) => i !== index));
  };

  const getDifficultyConfig = (difficulty: string) => {
    return DIFFICULTY_LEVELS.find(d => d.value === difficulty) || DIFFICULTY_LEVELS[0];
  };

  const getOutcomeTypeConfig = (type: string) => {
    return OUTCOME_TYPES.find(t => t.value === type) || OUTCOME_TYPES[0];
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Simulation Scenarios</h3>
        <Button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Scenario
        </Button>
      </div>

      {/* Scenario Creation/Edit Form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {editingScenario ? "Edit Scenario" : "Create New Scenario"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Scenario Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter scenario name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value) => setFormData({ ...formData, difficulty: value as SimulationScenario['difficulty'] })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTY_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the scenario and its context"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="objectives">Learning Objectives</Label>
                <Textarea
                  id="objectives"
                  value={formData.objectives}
                  onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                  placeholder="Enter each objective on a new line"
                  rows={4}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter one learning objective per line
                </p>
              </div>

              <div>
                <Label htmlFor="duration">Estimated Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  value={formData.estimatedDuration}
                  onChange={(e) => setFormData({ ...formData, estimatedDuration: parseInt(e.target.value) || 30 })}
                />
              </div>

              {/* Object Selection */}
              <div>
                <Label>Required Objects</Label>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                  {objects.length === 0 ? (
                    <p className="text-sm text-gray-500">No objects available</p>
                  ) : (
                    objects.map((object) => (
                      <div key={object.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`object-${object.id}`}
                          checked={formData.objects.includes(object.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                objects: [...formData.objects, object.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                objects: formData.objects.filter(id => id !== object.id)
                              });
                            }
                          }}
                        />
                        <Label htmlFor={`object-${object.id}`} className="text-sm">
                          {object.name} ({object.type})
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Outcomes */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <Label>Scenario Outcomes</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addOutcome}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Outcome
                  </Button>
                </div>
                <div className="space-y-3">
                  {outcomes.map((outcome, index) => {
                    const outcomeConfig = getOutcomeTypeConfig(outcome.type);
                    return (
                      <Card key={outcome.id} className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <outcomeConfig.icon className={`w-5 h-5 ${outcomeConfig.color}`} />
                            <Select
                              value={outcome.type}
                              onValueChange={(value) => updateOutcome(index, { type: value as any })}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {OUTCOME_TYPES.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOutcome(index)}
                            className="text-red-600"
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <Input
                            placeholder="Outcome title"
                            value={outcome.title}
                            onChange={(e) => updateOutcome(index, { title: e.target.value })}
                          />
                          <Input
                            type="number"
                            placeholder="Score"
                            value={outcome.score || ""}
                            onChange={(e) => updateOutcome(index, { score: parseInt(e.target.value) || undefined })}
                          />
                        </div>

                        <Textarea
                          placeholder="Outcome description"
                          value={outcome.description}
                          onChange={(e) => updateOutcome(index, { description: e.target.value })}
                          rows={2}
                          className="mb-2"
                        />

                        <Textarea
                          placeholder="Feedback message"
                          value={outcome.feedback}
                          onChange={(e) => updateOutcome(index, { feedback: e.target.value })}
                          rows={2}
                        />
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="medical, emergency, basic, advanced"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Comma-separated tags for organization
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingScenario ? "Update Scenario" : "Create Scenario"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Scenario List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {scenarios.map((scenario) => (
            <div key={scenario.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-medium">{scenario.name}</h3>
                  <p className="text-sm text-gray-600">{scenario.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{scenario.difficulty}</Badge>
                  <Badge variant="outline">{scenario.estimatedDuration} min</Badge>
                </div>
              </div>
              
              <div className="mt-2 space-y-2">
                <div>
                  <h4 className="text-sm font-medium mb-1">Objectives</h4>
                  <ul className="text-sm text-gray-600 list-disc list-inside">
                    {scenario.objectives.map((obj, index) => (
                      <li key={index}>{obj}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-1">Objects</h4>
                  <div className="flex flex-wrap gap-1">
                    {scenario.objects.map((objId) => {
                      const obj = objects.find(o => o.id === objId);
                      return obj ? (
                        <Badge key={objId} variant="outline" className="text-xs">
                          {obj.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-1">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {scenario.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(scenario)}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(scenario.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScenarioManager; 