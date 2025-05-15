import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X } from "lucide-react";
import { TaskDefinition } from "@/lib/ProcedureService";

export interface TaskDefinitionFormProps {
  onSubmit: (taskData: TaskDefinition) => void;
  initialData?: TaskDefinition | null;
}

const TaskDefinitionForm = ({ onSubmit, initialData }: TaskDefinitionFormProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [presenter, setPresenter] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [kpiTech, setKpiTech] = useState<string[]>([""]);
  const [kpiConcept, setKpiConcept] = useState<string[]>([""]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  
  // Load initial data if provided
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setDescription(initialData.description || "");
      setPresenter(initialData.presenter || "");
      setAffiliation(initialData.affiliation || "");
      setKpiTech(initialData.kpiTech && initialData.kpiTech.length > 0 ? initialData.kpiTech : [""]);
      setKpiConcept(initialData.kpiConcept && initialData.kpiConcept.length > 0 ? initialData.kpiConcept : [""]);
      setDate(initialData.date || new Date().toISOString().split("T")[0]);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty skills
    const techKpis = kpiTech.filter(skill => skill.trim() !== "");
    const conceptKpis = kpiConcept.filter(skill => skill.trim() !== "");
    
    onSubmit({
      name,
      description,
      presenter,
      affiliation,
      kpiTech: techKpis,
      kpiConcept: conceptKpis,
      date
    });
  };

  const handleAddTechSkill = () => {
    setKpiTech([...kpiTech, ""]);
  };

  const handleAddConceptSkill = () => {
    setKpiConcept([...kpiConcept, ""]);
  };

  const handleTechSkillChange = (index: number, value: string) => {
    const updatedSkills = [...kpiTech];
    updatedSkills[index] = value;
    setKpiTech(updatedSkills);
  };

  const handleConceptSkillChange = (index: number, value: string) => {
    const updatedSkills = [...kpiConcept];
    updatedSkills[index] = value;
    setKpiConcept(updatedSkills);
  };

  const handleRemoveTechSkill = (index: number) => {
    if (kpiTech.length > 1) {
      const updatedSkills = [...kpiTech];
      updatedSkills.splice(index, 1);
      setKpiTech(updatedSkills);
    }
  };

  const handleRemoveConceptSkill = (index: number) => {
    if (kpiConcept.length > 1) {
      const updatedSkills = [...kpiConcept];
      updatedSkills.splice(index, 1);
      setKpiConcept(updatedSkills);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Define Your Learning Task</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Procedure/Task Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Enter the procedure or task name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Briefly describe the procedure or task"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px]"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="presenter">Presenter Name</Label>
              <Input
                id="presenter"
                name="presenter"
                placeholder="Enter presenter name"
                value={presenter}
                onChange={(e) => setPresenter(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="affiliation">Affiliation</Label>
              <Input
                id="affiliation"
                name="affiliation"
                placeholder="Enter affiliation"
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Recording Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Technical Skills (KPIs)</Label>

            {kpiTech.map((skill, index) => (
              <div key={`tech-${index}`} className="flex space-x-2 mb-2">
                <Input
                  placeholder={`Technical Skill ${index + 1}`}
                  value={skill}
                  onChange={(e) => handleTechSkillChange(index, e.target.value)}
                />
                {kpiTech.length > 1 && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleRemoveTechSkill(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleAddTechSkill}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Technical Skill
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Conceptual Skills (KPIs)</Label>

            {kpiConcept.map((skill, index) => (
              <div key={`concept-${index}`} className="flex space-x-2 mb-2">
                <Input
                  placeholder={`Conceptual Skill ${index + 1}`}
                  value={skill}
                  onChange={(e) => handleConceptSkillChange(index, e.target.value)}
                />
                {kpiConcept.length > 1 && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleRemoveConceptSkill(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleAddConceptSkill}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Conceptual Skill
            </Button>
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Save & Continue
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default TaskDefinitionForm;
