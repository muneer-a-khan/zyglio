"use client";

import React, { useState, useCallback } from 'react';
import { Plus, Play, Mic, MicOff, Volume2, Edit3, Trash2, CheckCircle } from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// Types
import { 
  ScenarioStep, 
  SmartObject, 
  ScenarioFlowBuilderProps,
  ScenarioStepFormData 
} from '@/types/unified';
import { generateId } from '@/lib/utils';
import { voiceService, VoiceRecording } from '@/lib/voice-service';

// Category icons for objects (reused from object library)
const categoryIcons = {
  'Ingredient': '🧪',
  'Tool': '🔧',
  'Equipment': '⚙️',
  'Person': '👤',
  'Location': '📍'
};

interface StepFormData extends ScenarioStepFormData {
  position: { x: number; y: number };
}

export function ScenarioFlowBuilder({ 
  objects, 
  scenarioSteps, 
  onAddStep, 
  onUpdateStep,
  onDeleteStep,
  currentProcedureId 
}: ScenarioFlowBuilderProps) {
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<string | null>(null);
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  
  // Form state for new/editing steps
  const [stepForm, setStepForm] = useState<StepFormData>({
    instruction: '',
    requiredObjects: [],
    requiredActions: [],
    conditions: [],
    feedback: '',
    isCheckpoint: false,
    expectedResponses: [],
    position: { x: 100, y: 100 }
  });

  // Helper function to get object by ID
  const getObjectById = (id: string) => objects.find(obj => obj.id === id);

  // Reset form
  const resetForm = () => {
    setStepForm({
      instruction: '',
      requiredObjects: [],
      requiredActions: [],
      conditions: [],
      feedback: '',
      isCheckpoint: false,
      expectedResponses: [],
      position: { x: 100, y: 100 + (scenarioSteps.length * 60) }
    });
    setSelectedObjects([]);
  };

  // Handle form submission
  const handleSubmitStep = () => {
    const newStep: ScenarioStep = {
      id: editingStep || generateId('step'),
      instruction: stepForm.instruction,
      requiredObjects: stepForm.requiredObjects,
      requiredActions: stepForm.requiredActions,
      conditions: stepForm.conditions,
      feedback: stepForm.feedback,
      position: stepForm.position,
      stepIndex: editingStep ? 
        scenarioSteps.find(s => s.id === editingStep)?.stepIndex || scenarioSteps.length :
        scenarioSteps.length,
      isCheckpoint: stepForm.isCheckpoint,
      expectedResponses: stepForm.expectedResponses,
      procedureId: currentProcedureId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (editingStep) {
      onUpdateStep(editingStep, newStep);
      setEditingStep(null);
    } else {
      onAddStep(newStep);
    }

    resetForm();
    setIsAddingStep(false);
  };

  // Handle editing existing step
  const handleEditStep = (step: ScenarioStep) => {
    setStepForm({
      instruction: step.instruction,
      requiredObjects: step.requiredObjects,
      requiredActions: step.requiredActions,
      conditions: step.conditions,
      feedback: step.feedback,
      isCheckpoint: step.isCheckpoint || false,
      expectedResponses: step.expectedResponses || [],
      position: step.position
    });
    setSelectedObjects(step.requiredObjects);
    setEditingStep(step.id);
    setIsAddingStep(true);
  };

  // Toggle object selection
  const toggleObjectSelection = (objectId: string) => {
    const newSelected = selectedObjects.includes(objectId)
      ? selectedObjects.filter(id => id !== objectId)
      : [...selectedObjects, objectId];
    
    setSelectedObjects(newSelected);
    setStepForm(prev => ({ ...prev, requiredObjects: newSelected }));
  };

  // Mock voice recording functions (to be integrated with Zyglio's voice system)
  const startRecording = (stepId: string) => {
    setIsRecording(stepId);
    // TODO: Integrate with Zyglio's voice recording system
    console.log('Starting voice recording for step:', stepId);
  };

  const stopRecording = () => {
    setIsRecording(null);
    // TODO: Process recording and update step with transcript
    console.log('Stopping voice recording');
  };

  // Add new action/condition
  const addToArray = (field: 'requiredActions' | 'conditions' | 'expectedResponses', value: string) => {
    if (value.trim()) {
      setStepForm(prev => ({
        ...prev,
        [field]: [...prev[field], value.trim()]
      }));
    }
  };

  // Remove from array
  const removeFromArray = (field: 'requiredActions' | 'conditions' | 'expectedResponses', index: number) => {
    setStepForm(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Play className="w-5 h-5" />
              Scenario Flow Builder
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Create step-by-step scenarios using your defined objects
            </p>
          </div>
          
          <Button 
            onClick={() => setIsAddingStep(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Step
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-4 text-sm text-gray-600">
          <span>{scenarioSteps.length} steps</span>
          <span>{objects.length} objects available</span>
          <span>{scenarioSteps.filter(s => s.isCheckpoint).length} checkpoints</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Step List */}
        <div className="w-1/2 border-r border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Scenario Steps</h3>
          </div>
          
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {scenarioSteps.length === 0 ? (
                <div className="text-center py-12">
                  <Play className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No steps yet</h3>
                  <p className="text-gray-600 mb-4">
                    Create your first scenario step to get started
                  </p>
                  <Button onClick={() => setIsAddingStep(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Step
                  </Button>
                </div>
              ) : (
                scenarioSteps.map((step, index) => (
                  <Card key={step.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-medium flex items-center justify-center">
                            {index + 1}
                          </div>
                          <CardTitle className="text-sm">{step.instruction}</CardTitle>
                          {step.isCheckpoint && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {/* Voice Recording Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => isRecording === step.id ? stopRecording() : startRecording(step.id)}
                            className={isRecording === step.id ? 'text-red-600' : ''}
                          >
                            {isRecording === step.id ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                          </Button>
                          
                          {/* Play Audio Button (if transcript exists) */}
                          {step.transcript && (
                            <Button variant="ghost" size="sm">
                              <Volume2 className="w-4 h-4" />
                            </Button>
                          )}
                          
                          {/* Edit Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditStep(step)}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          
                          {/* Delete Button */}
                          {onDeleteStep && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeleteStep(step.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      {/* Required Objects */}
                      {step.requiredObjects.length > 0 && (
                        <div className="mb-3">
                          <Label className="text-xs text-gray-600">Required Objects</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {step.requiredObjects.map(objId => {
                              const obj = getObjectById(objId);
                              return obj ? (
                                <Badge key={objId} variant="outline" className="text-xs">
                                  {categoryIcons[obj.category as keyof typeof categoryIcons]} {obj.name}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Actions */}
                      {step.requiredActions.length > 0 && (
                        <div className="mb-3">
                          <Label className="text-xs text-gray-600">Actions</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {step.requiredActions.map((action, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {action}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Feedback */}
                      {step.feedback && (
                        <div className="text-xs text-gray-600">
                          <strong>Feedback:</strong> {step.feedback}
                        </div>
                      )}
                      
                      {/* Voice Transcript */}
                      {step.transcript && (
                        <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                          <strong>Voice Note:</strong> {step.transcript}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Object Selection Panel */}
        <div className="w-1/2">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Available Objects</h3>
            <p className="text-sm text-gray-600">Select objects to use in your scenario steps</p>
          </div>
          
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {objects.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No objects defined yet.</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Create some objects first to use them in scenarios.
                  </p>
                </div>
              ) : (
                objects.map(object => (
                  <Card 
                    key={object.id} 
                    className={`cursor-pointer transition-all ${
                      selectedObjects.includes(object.id) ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-sm'
                    }`}
                    onClick={() => toggleObjectSelection(object.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {categoryIcons[object.category as keyof typeof categoryIcons]}
                          </span>
                          <div>
                            <div className="font-medium text-sm">{object.name}</div>
                            <div className="text-xs text-gray-600">{object.category}</div>
                          </div>
                        </div>
                        
                        <Checkbox 
                          checked={selectedObjects.includes(object.id)}
                          onChange={() => {}} // Handled by card click
                        />
                      </div>
                      
                      {/* Current State */}
                      {object.currentState && (
                        <div className="mt-2">
                          <Badge variant="secondary" className="text-xs">
                            State: {object.currentState}
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Add/Edit Step Dialog */}
      <Dialog open={isAddingStep} onOpenChange={setIsAddingStep}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStep ? 'Edit Step' : 'Add New Step'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Instruction */}
            <div>
              <Label htmlFor="instruction">Step Instruction</Label>
              <Textarea
                id="instruction"
                value={stepForm.instruction}
                onChange={(e) => setStepForm(prev => ({ ...prev, instruction: e.target.value }))}
                placeholder="Describe what the user should do in this step..."
                className="mt-1"
              />
            </div>
            
            {/* Required Objects */}
            <div>
              <Label>Required Objects ({stepForm.requiredObjects.length} selected)</Label>
              <div className="mt-2 max-h-32 overflow-y-auto border rounded p-2">
                {objects.map(object => (
                  <div key={object.id} className="flex items-center gap-2 py-1">
                    <Checkbox
                      checked={stepForm.requiredObjects.includes(object.id)}
                      onCheckedChange={() => toggleObjectSelection(object.id)}
                    />
                    <span className="text-sm">
                      {categoryIcons[object.category as keyof typeof categoryIcons]} {object.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Actions, Conditions, and other fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Required Actions</Label>
                <div className="mt-1 space-y-2">
                  <Input
                    placeholder="Add action..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addToArray('requiredActions', e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <div className="flex flex-wrap gap-1">
                    {stepForm.requiredActions.map((action, i) => (
                      <Badge key={i} variant="secondary" className="text-xs cursor-pointer" 
                             onClick={() => removeFromArray('requiredActions', i)}>
                        {action} ×
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Conditions</Label>
                <div className="mt-1 space-y-2">
                  <Input
                    placeholder="Add condition..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addToArray('conditions', e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <div className="flex flex-wrap gap-1">
                    {stepForm.conditions.map((condition, i) => (
                      <Badge key={i} variant="outline" className="text-xs cursor-pointer"
                             onClick={() => removeFromArray('conditions', i)}>
                        {condition} ×
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Feedback */}
            <div>
              <Label htmlFor="feedback">Success Feedback</Label>
              <Textarea
                id="feedback"
                value={stepForm.feedback}
                onChange={(e) => setStepForm(prev => ({ ...prev, feedback: e.target.value }))}
                placeholder="Message to show when step is completed successfully..."
                className="mt-1"
              />
            </div>
            
            {/* Checkpoint Toggle */}
            <div className="flex items-center gap-2">
              <Checkbox
                checked={stepForm.isCheckpoint}
                onCheckedChange={(checked) => setStepForm(prev => ({ ...prev, isCheckpoint: !!checked }))}
              />
              <Label>Mark as checkpoint</Label>
              <span className="text-xs text-gray-600">(Critical step that must be completed correctly)</span>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => { setIsAddingStep(false); resetForm(); setEditingStep(null); }}>
                Cancel
              </Button>
              <Button onClick={handleSubmitStep}>
                {editingStep ? 'Update Step' : 'Add Step'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 