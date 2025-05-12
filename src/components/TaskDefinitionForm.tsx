
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
  presenter: string;
  affiliation: string;
  kpis: string[];
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
    kpis: [""]
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTaskData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleKpiChange = (index: number, value: string) => {
    const newKpis = [...taskData.kpis];
    newKpis[index] = value;
    setTaskData(prev => ({ ...prev, kpis: newKpis }));
  };
  
  const addKpi = () => {
    setTaskData(prev => ({ ...prev, kpis: [...prev.kpis, ""] }));
  };
  
  const removeKpi = (index: number) => {
    if (taskData.kpis.length > 1) {
      const newKpis = taskData.kpis.filter((_, i) => i !== index);
      setTaskData(prev => ({ ...prev, kpis: newKpis }));
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out empty KPIs
    const filteredKpis = taskData.kpis.filter(kpi => kpi.trim() !== "");
    const updatedTaskData = { ...taskData, kpis: filteredKpis };
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
          
          <div className="space-y-3">
            <Label>Key Performance Indicators (KPIs)</Label>
            
            {taskData.kpis.map((kpi, index) => (
              <div key={index} className="flex space-x-2">
                <Input
                  placeholder={`KPI ${index + 1}`}
                  value={kpi}
                  onChange={(e) => handleKpiChange(index, e.target.value)}
                />
                
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeKpi(index)}
                  disabled={taskData.kpis.length === 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={addKpi}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Another KPI
            </Button>
          </div>
          
          <Button type="submit" className="w-full bg-medical-600 hover:bg-medical-700">
            Save & Continue
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default TaskDefinitionForm;
