import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X } from "lucide-react";

interface TaskDefinition {
  name: string;
  description: string;
  kpiTech: string[];
  kpiConcept: string[];
  presenter: string;
  affiliation: string;
  date: string;
}

interface TaskDefinitionFormProps {
  onSubmit: (taskData: TaskDefinition) => void;
}

const TaskDefinitionForm = ({ onSubmit }: TaskDefinitionFormProps) => {
  const [taskData, setTaskData] = useState<TaskDefinition>({
    name: "",
    description: "",
    presenter: "",
    affiliation: "",
    kpiTech: [""],
    kpiConcept: [""],
    date: new Date().toISOString().split('T')[0]
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTaskData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleKpiChange = (type: 'kpiTech' | 'kpiConcept', index: number, value: string) => {
    const newKpis = [...taskData[type]];
    newKpis[index] = value;
    setTaskData(prev => ({ ...prev, [type]: newKpis }));
  };
  
  const addKpi = (type: 'kpiTech' | 'kpiConcept') => {
    setTaskData(prev => ({ ...prev, [type]: [...prev[type], ""] }));
  };
  
  const removeKpi = (type: 'kpiTech' | 'kpiConcept', index: number) => {
    if (taskData[type].length > 1) {
      const newKpis = taskData[type].filter((_, i) => i !== index);
      setTaskData(prev => ({ ...prev, [type]: newKpis }));
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out empty KPIs
    const filteredKpiTech = taskData.kpiTech.filter(kpi => kpi.trim() !== "");
    const filteredKpiConcept = taskData.kpiConcept.filter(kpi => kpi.trim() !== "");
    const updatedTaskData = { 
      ...taskData, 
      kpiTech: filteredKpiTech,
      kpiConcept: filteredKpiConcept 
    };
    onSubmit(updatedTaskData);
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
              value={taskData.name}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Briefly describe the procedure or task"
              value={taskData.description}
              onChange={handleChange}
              className="min-h-[100px]"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="presenter">Presenter Name</Label>
              <Input
                id="presenter"
                name="presenter"
                placeholder="Enter presenter name"
                value={taskData.presenter}
                onChange={handleChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="affiliation">Affiliation</Label>
              <Input
                id="affiliation"
                name="affiliation"
                placeholder="Enter affiliation"
                value={taskData.affiliation}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="date">Recording Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              value={taskData.date}
              onChange={handleChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Technical Skills (KPIs)</Label>
            
            {taskData.kpiTech.map((kpi, index) => (
              <div key={`tech-${index}`} className="flex space-x-2">
                <Input
                  placeholder={`Technical Skill ${index + 1}`}
                  value={kpi}
                  onChange={(e) => handleKpiChange('kpiTech', index, e.target.value)}
                />
                
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeKpi('kpiTech', index)}
                  disabled={taskData.kpiTech.length === 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => addKpi('kpiTech')}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Technical Skill
            </Button>
          </div>
          
          <div className="space-y-2">
            <Label>Conceptual Skills (KPIs)</Label>
            
            {taskData.kpiConcept.map((kpi, index) => (
              <div key={`concept-${index}`} className="flex space-x-2">
                <Input
                  placeholder={`Conceptual Skill ${index + 1}`}
                  value={kpi}
                  onChange={(e) => handleKpiChange('kpiConcept', index, e.target.value)}
                />
                
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeKpi('kpiConcept', index)}
                  disabled={taskData.kpiConcept.length === 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => addKpi('kpiConcept')}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Conceptual Skill
            </Button>
          </div>
          
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
            Save & Continue
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default TaskDefinitionForm;
