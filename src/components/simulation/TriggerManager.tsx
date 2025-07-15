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
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  Edit, 
  Trash, 
  Zap,
  Clock,
  MousePointer,
  MessageSquare,
  Volume2,
  Highlighter,
  RotateCcw,
  StopCircle,
  Play,
  Pause
} from "lucide-react";
import { toast } from "sonner";
import { SimulationTrigger, TriggerAction, SimulationObject } from "@/types/simulation";
import { simulationEngine } from "@/lib/simulation-engine";

interface TriggerManagerProps {
  triggers: SimulationTrigger[];
  objects: SimulationObject[];
  onTriggersChange: (triggers: SimulationTrigger[]) => void;
}

const TRIGGER_TYPES = [
  { value: "event", label: "Event-based", icon: Zap },
  { value: "condition", label: "Condition-based", icon: MousePointer },
  { value: "timer", label: "Timer-based", icon: Clock },
  { value: "user_action", label: "User Action", icon: MousePointer },
  { value: "system_state", label: "System State", icon: MessageSquare },
];

const EVENT_TYPES = [
  { value: "step_start", label: "Step Started" },
  { value: "step_complete", label: "Step Completed" },
  { value: "timer_elapsed", label: "Timer Elapsed" },
  { value: "object_interaction", label: "Object Interaction" },
  { value: "voice_command", label: "Voice Command" },
  { value: "text_input", label: "Text Input" },
];

const ACTION_TYPES = [
  { value: "show_message", label: "Show Message", icon: MessageSquare },
  { value: "play_audio", label: "Play Audio", icon: Volume2 },
  { value: "highlight_object", label: "Highlight Object", icon: Highlighter },
  { value: "change_state", label: "Change State", icon: RotateCcw },
  { value: "branch_step", label: "Branch to Step", icon: Play },
  { value: "end_simulation", label: "End Simulation", icon: StopCircle },
];

const PRIORITY_LEVELS = [
  { value: "low", label: "Low", color: "bg-gray-100 text-gray-800" },
  { value: "medium", label: "Medium", color: "bg-blue-100 text-blue-800" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-800" },
  { value: "critical", label: "Critical", color: "bg-red-100 text-red-800" },
];

const TriggerManager = ({ triggers, objects, onTriggersChange }: TriggerManagerProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<SimulationTrigger | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "event" as SimulationTrigger['type'],
    eventType: "step_start",
    eventTarget: "",
    eventParameters: "",
    priority: "medium" as SimulationTrigger['priority'],
    isActive: true,
    cooldown: "",
    maxActivations: "",
    tags: "",
  });
  const [actions, setActions] = useState<TriggerAction[]>([]);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "event",
      eventType: "step_start",
      eventTarget: "",
      eventParameters: "",
      priority: "medium",
      isActive: true,
      cooldown: "",
      maxActivations: "",
      tags: "",
    });
    setActions([]);
    setIsCreating(false);
    setEditingTrigger(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let eventParameters = {};
      let tags: string[] = [];

      // Parse event parameters
      if (formData.eventParameters.trim()) {
        try {
          eventParameters = JSON.parse(formData.eventParameters);
        } catch (error) {
          toast.error("Invalid JSON format for event parameters");
          return;
        }
      }

      // Parse tags
      if (formData.tags.trim()) {
        tags = formData.tags.split(",").map(t => t.trim()).filter(Boolean);
      }

      const triggerData = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        event: {
          type: formData.eventType as any,
          target: formData.eventTarget || undefined,
          parameters: eventParameters,
        },
        conditions: [], // Will be enhanced in future
        actions,
        priority: formData.priority,
        isActive: formData.isActive,
        cooldown: formData.cooldown ? parseInt(formData.cooldown) : undefined,
        maxActivations: formData.maxActivations ? parseInt(formData.maxActivations) : undefined,
        tags,
      };

      let updatedTriggers: SimulationTrigger[];

      if (editingTrigger) {
        // Update existing trigger
        const updatedTrigger = await simulationEngine.createTrigger({
          ...triggerData,
          id: editingTrigger.id,
          createdAt: editingTrigger.createdAt,
          updatedAt: new Date()
        });
        
        updatedTriggers = triggers.map(trigger => 
          trigger.id === editingTrigger.id ? updatedTrigger : trigger
        );
        toast.success("Trigger updated successfully");
      } else {
        // Create new trigger
        const newTrigger = await simulationEngine.createTrigger(triggerData);
        updatedTriggers = [...triggers, newTrigger];
        toast.success("Trigger created successfully");
      }

      onTriggersChange(updatedTriggers);
      resetForm();
    } catch (error) {
      console.error("Error saving trigger:", error);
      toast.error("Failed to save trigger");
    }
  };

  const handleEdit = (trigger: SimulationTrigger) => {
    setEditingTrigger(trigger);
    setFormData({
      name: trigger.name || "",
      description: trigger.description || "",
      type: trigger.type || "event",
      eventType: "custom", // Default since trigger.event doesn't exist
      eventTarget: "",
      eventParameters: "{}",
      priority: trigger.priority || "medium",
      isActive: trigger.isActive ?? true,
      cooldown: trigger.cooldown?.toString() || "",
      maxActivations: trigger.maxActivations?.toString() || "",
      tags: trigger.simulationTags?.join(", ") || "",
    });
    setActions([]); // Default empty array since trigger.actions doesn't exist
    setIsCreating(true);
  };

  const handleDelete = async (triggerId: string) => {
    if (!confirm("Are you sure you want to delete this trigger?")) return;

    try {
      const updatedTriggers = triggers.filter(trigger => trigger.id !== triggerId);
      onTriggersChange(updatedTriggers);
      toast.success("Trigger deleted successfully");
    } catch (error) {
      console.error("Error deleting trigger:", error);
      toast.error("Failed to delete trigger");
    }
  };

  const addAction = () => {
    const newAction: TriggerAction = {
      id: `action_${Date.now()}`,
      type: "show_message",
      description: "",
      parameters: {},
    };
    setActions([...actions, newAction]);
  };

  const updateAction = (index: number, updates: Partial<TriggerAction>) => {
    const updatedActions = actions.map((action, i) => 
      i === index ? { ...action, ...updates } : action
    );
    setActions(updatedActions);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const getTriggerTypeConfig = (type: string) => {
    return TRIGGER_TYPES.find(t => t.value === type) || TRIGGER_TYPES[0];
  };

  const getActionTypeConfig = (type: string) => {
    return ACTION_TYPES.find(a => a.value === type) || ACTION_TYPES[0];
  };

  const getPriorityConfig = (priority: string) => {
    return PRIORITY_LEVELS.find(p => p.value === priority) || PRIORITY_LEVELS[1];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Simulation Triggers</h3>
        <Button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Trigger
        </Button>
      </div>

      {/* Trigger Creation/Edit Form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {editingTrigger ? "Edit Trigger" : "Create New Trigger"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Trigger Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter trigger name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">Trigger Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value as SimulationTrigger['type'] })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select trigger type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGER_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="w-4 h-4" />
                            {type.label}
                          </div>
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
                  placeholder="Describe what this trigger does"
                  rows={3}
                />
              </div>

              {/* Event Configuration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="eventType">Event Type</Label>
                  <Select
                    value={formData.eventType}
                    onValueChange={(value) => setFormData({ ...formData, eventType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((event) => (
                        <SelectItem key={event.value} value={event.value}>
                          {event.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="eventTarget">Event Target (optional)</Label>
                  <Input
                    id="eventTarget"
                    value={formData.eventTarget}
                    onChange={(e) => setFormData({ ...formData, eventTarget: e.target.value })}
                    placeholder="Target object, step, or element ID"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="eventParameters">Event Parameters (JSON)</Label>
                <Textarea
                  id="eventParameters"
                  value={formData.eventParameters}
                  onChange={(e) => setFormData({ ...formData, eventParameters: e.target.value })}
                  placeholder='{"interval": 30, "threshold": 5}'
                  rows={3}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Additional parameters for the event in JSON format
                </p>
              </div>

              {/* Priority and Settings */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value as SimulationTrigger['priority'] })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="cooldown">Cooldown (seconds)</Label>
                  <Input
                    id="cooldown"
                    type="number"
                    min="0"
                    value={formData.cooldown}
                    onChange={(e) => setFormData({ ...formData, cooldown: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label htmlFor="maxActivations">Max Activations</Label>
                  <Input
                    id="maxActivations"
                    type="number"
                    min="1"
                    value={formData.maxActivations}
                    onChange={(e) => setFormData({ ...formData, maxActivations: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>

              {/* Actions */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <Label>Trigger Actions</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addAction}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Action
                  </Button>
                </div>
                <div className="space-y-3">
                  {actions.map((action, index) => {
                    const actionConfig = getActionTypeConfig(action.type);
                    return (
                      <Card key={action.id} className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <actionConfig.icon className="w-5 h-5 text-blue-600" />
                            <Select
                              value={action.type}
                              onValueChange={(value) => updateAction(index, { type: value as any })}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ACTION_TYPES.map((type) => (
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
                            onClick={() => removeAction(index)}
                            className="text-red-600"
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <Textarea
                            placeholder="Action description"
                            value={action.description}
                            onChange={(e) => updateAction(index, { description: e.target.value })}
                            rows={2}
                          />
                          <Input
                            type="number"
                            placeholder="Delay (ms)"
                            value={action.delay || ""}
                            onChange={(e) => updateAction(index, { delay: parseInt(e.target.value) || undefined })}
                          />
                        </div>

                        {/* Action-specific parameters */}
                        {action.type === "show_message" && (
                          <div className="space-y-2">
                            <Input
                              placeholder="Message title"
                              value={action.parameters?.title || ""}
                              onChange={(e) => updateAction(index, {
                                parameters: { ...action.parameters || {}, title: e.target.value }
                              })}
                            />
                            <Textarea
                              placeholder="Message content"
                              value={action.parameters?.message || ""}
                              onChange={(e) => updateAction(index, {
                                parameters: { ...action.parameters || {}, message: e.target.value }
                              })}
                              rows={2}
                            />
                          </div>
                        )}

                        {action.type === "play_audio" && (
                          <Input
                            placeholder="Audio URL"
                                                          value={action.parameters?.audioUrl || ""}
                              onChange={(e) => updateAction(index, {
                                parameters: { ...action.parameters || {}, audioUrl: e.target.value }
                              })}
                          />
                        )}

                        {action.type === "highlight_object" && (
                          <Select
                            value={action.parameters?.objectId || ""}
                            onValueChange={(value) => updateAction(index, {
                              parameters: { ...action.parameters || {}, objectId: value }
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select object to highlight" />
                            </SelectTrigger>
                            <SelectContent>
                              {objects.map((object) => (
                                <SelectItem key={object.id} value={object.id}>
                                  {object.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {action.type === "change_state" && (
                          <div className="grid grid-cols-3 gap-2">
                            <Select
                              value={action.parameters?.objectId || ""}
                              onValueChange={(value) => updateAction(index, {
                                parameters: { ...action.parameters || {}, objectId: value }
                              })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Object" />
                              </SelectTrigger>
                              <SelectContent>
                                {objects.map((object) => (
                                  <SelectItem key={object.id} value={object.id}>
                                    {object.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              placeholder="Property"
                              value={action.parameters?.property || ""}
                              onChange={(e) => updateAction(index, {
                                parameters: { ...action.parameters || {}, property: e.target.value }
                              })}
                            />
                            <Input
                              placeholder="New value"
                              value={action.parameters?.value || ""}
                              onChange={(e) => updateAction(index, {
                                parameters: { ...action.parameters || {}, value: e.target.value }
                              })}
                            />
                          </div>
                        )}

                        {action.type === "branch_step" && (
                          <Input
                            placeholder="Target step ID"
                                                          value={action.parameters?.stepId || ""}
                              onChange={(e) => updateAction(index, {
                                parameters: { ...action.parameters || {}, stepId: e.target.value }
                              })}
                          />
                        )}

                        {action.type === "end_simulation" && (
                          <Input
                            placeholder="End reason"
                                                          value={action.parameters?.reason || ""}
                              onChange={(e) => updateAction(index, {
                                parameters: { ...action.parameters || {}, reason: e.target.value }
                              })}
                          />
                        )}
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
                  placeholder="safety, warning, feedback, completion"
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
                  {editingTrigger ? "Update Trigger" : "Create Trigger"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Triggers List */}
      <div className="grid gap-4">
        {triggers.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-gray-500">
              <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Triggers Created</h3>
              <p>Create triggers to add dynamic behavior to your simulations.</p>
            </div>
          </Card>
        ) : (
          triggers.map((trigger) => {
            const triggerConfig = getTriggerTypeConfig(trigger.type || "event");
            const priorityConfig = getPriorityConfig(trigger.priority || "medium");
            return (
              <Card key={trigger.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <triggerConfig.icon className="w-5 h-5 text-blue-600" />
                        <h4 className="font-medium text-lg">{trigger.name}</h4>
                        <Badge className={priorityConfig.color}>
                          {priorityConfig.label}
                        </Badge>
                        <Badge variant={trigger.isActive ? "default" : "secondary"}>
                          {trigger.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      {trigger.description && (
                        <p className="text-gray-600 mb-3">{trigger.description}</p>
                      )}

                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Event:</p>
                          <p className="text-sm text-gray-600">
                            {EVENT_TYPES.find(e => e.value === trigger.event?.type)?.label}
                            {trigger.event?.target && ` → ${trigger.event.target}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Actions:</p>
                          <div className="flex flex-wrap gap-1">
                            {trigger.actions?.slice(0, 3).map((action, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {ACTION_TYPES.find(a => a.value === action.type)?.label}
                              </Badge>
                            ))}
                            {trigger.actions && trigger.actions.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{trigger.actions.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {(trigger.cooldown || trigger.maxActivations) && (
                        <div className="flex gap-4 mb-3 text-sm text-gray-600">
                          {trigger.cooldown && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Cooldown: {trigger.cooldown}s
                            </div>
                          )}
                          {trigger.maxActivations && (
                            <div className="flex items-center gap-1">
                              <Zap className="w-4 h-4" />
                              Max: {trigger.maxActivations}
                            </div>
                          )}
                        </div>
                      )}

                      {trigger.simulationTags && trigger.simulationTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {trigger.simulationTags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="text-xs text-gray-500">
                        Created: {trigger.createdAt ? new Date(trigger.createdAt).toLocaleDateString() : 'Unknown'}
                        {trigger.updatedAt && trigger.updatedAt !== trigger.createdAt && (
                          <span className="ml-2">
                            Updated: {new Date(trigger.updatedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(trigger)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(trigger.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TriggerManager; 