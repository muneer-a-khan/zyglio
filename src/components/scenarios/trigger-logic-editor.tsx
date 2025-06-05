"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Zap, Edit, Trash2, AlertTriangle, Code, Play } from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Types
import { 
  Trigger, 
  SmartObject, 
  TriggerLogicEditorProps,
  TriggerFormData,
  TRIGGER_CONDITIONS,
  ACTION_TYPES 
} from '@/types/unified';

// Form Schema
const triggerSchema = z.object({
  objectId: z.string().min(1, 'Please select an object'),
  signal: z.string().min(1, 'Signal is required'),
  condition: z.string().min(1, 'Condition is required'),
  action: z.string().min(1, 'Action is required'),
  isActive: z.boolean().default(true)
});

// Category icons for objects
const categoryIcons = {
  'Ingredient': '🧪',
  'Tool': '🔧',
  'Equipment': '⚙️',
  'Person': '👤',
  'Location': '📍'
};

// Action type icons
const actionTypeIcons = {
  'change_state': '🔄',
  'emit_signal': '📡',
  'show_feedback': '💬',
  'complete_step': '✅',
  'fail_step': '❌'
};

// Condition type descriptions
const conditionDescriptions = {
  'equals': 'Value equals exactly',
  'not_equals': 'Value does not equal',
  'contains': 'Value contains text',
  'greater_than': 'Numeric value is greater than',
  'less_than': 'Numeric value is less than',
  'exists': 'Property or state exists',
  'not_exists': 'Property or state does not exist'
};

export function TriggerLogicEditor({ 
  objects, 
  triggers, 
  onAddTrigger,
  onUpdateTrigger,
  onDeleteTrigger,
  currentScenarioId 
}: TriggerLogicEditorProps) {
  const [isAddingTrigger, setIsAddingTrigger] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<string | null>(null);
  const [selectedObject, setSelectedObject] = useState<SmartObject | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [testResults, setTestResults] = useState<{ [key: string]: boolean }>({});

  const form = useForm<TriggerFormData>({
    resolver: zodResolver(triggerSchema),
    defaultValues: {
      objectId: '',
      signal: '',
      condition: '',
      action: '',
      isActive: true
    }
  });

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = form;
  const watchedObjectId = watch('objectId');
  const watchedSignal = watch('signal');

  // Get object by ID
  const getObjectById = (id: string) => objects.find(obj => obj.id === id);

  // Reset form
  const resetForm = () => {
    reset();
    setSelectedObject(null);
    setEditingTrigger(null);
  };

  // Handle object selection
  const handleObjectSelection = (objectId: string) => {
    const object = getObjectById(objectId);
    setSelectedObject(object || null);
    setValue('objectId', objectId);
    
    // Reset signal when object changes
    setValue('signal', '');
  };

  // Handle form submission
  const handleSubmitTrigger = (data: TriggerFormData) => {
    try {
      const newTrigger: Trigger = {
        id: editingTrigger || `trigger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        objectId: data.objectId,
        signal: data.signal,
        condition: data.condition,
        action: data.action,
        scenarioId: currentScenarioId,
        isActive: data.isActive,
        createdAt: new Date()
      };

      if (editingTrigger && onUpdateTrigger) {
        onUpdateTrigger(editingTrigger, newTrigger);
      } else {
        onAddTrigger(newTrigger);
      }

      resetForm();
      setIsAddingTrigger(false);
    } catch (error) {
      console.error('Error saving trigger:', error);
      // In production, you would show a proper error message to the user
    }
  };

  // Handle editing existing trigger
  const handleEditTrigger = (trigger: Trigger) => {
    const object = getObjectById(trigger.objectId);
    setSelectedObject(object || null);
    
    setValue('objectId', trigger.objectId);
    setValue('signal', trigger.signal);
    setValue('condition', trigger.condition);
    setValue('action', trigger.action);
    setValue('isActive', trigger.isActive ?? true);
    
    setEditingTrigger(trigger.id);
    setIsAddingTrigger(true);
  };

  // Test trigger logic
  const testTrigger = (triggerId: string) => {
    // Simulate trigger test
    const success = Math.random() > 0.3; // 70% success rate for demo
    setTestResults(prev => ({ ...prev, [triggerId]: success }));
    
    // Clear test result after 3 seconds
    setTimeout(() => {
      setTestResults(prev => {
        const newResults = { ...prev };
        delete newResults[triggerId];
        return newResults;
      });
    }, 3000);
  };

  // Group triggers by object
  const triggersByObject = triggers.reduce((acc, trigger) => {
    const objectId = trigger.objectId;
    if (!acc[objectId]) {
      acc[objectId] = [];
    }
    acc[objectId].push(trigger);
    return acc;
  }, {} as { [key: string]: Trigger[] });

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Trigger Logic Editor
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Define how objects respond to conditions and signals
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={testMode}
                onCheckedChange={setTestMode}
                id="test-mode"
              />
              <Label htmlFor="test-mode" className="text-sm">Test Mode</Label>
            </div>
            
            <Button 
              onClick={() => setIsAddingTrigger(true)}
              className="flex items-center gap-2"
              disabled={objects.length === 0}
            >
              <Plus className="w-4 h-4" />
              Add Trigger
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-4 text-sm text-gray-600">
          <span>{triggers.length} triggers</span>
          <span>{triggers.filter(t => t.isActive).length} active</span>
          <span>{Object.keys(triggersByObject).length} objects with triggers</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {objects.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Objects Available</h3>
              <p className="text-gray-600">
                You need to create some smart objects before you can add triggers.
              </p>
            </div>
          </div>
        ) : triggers.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Triggers Yet</h3>
              <p className="text-gray-600 mb-4">
                Create your first trigger to make objects interactive
              </p>
              <Button onClick={() => setIsAddingTrigger(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Trigger
              </Button>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full p-6">
            <div className="space-y-6">
              {Object.entries(triggersByObject).map(([objectId, objectTriggers]) => {
                const object = getObjectById(objectId);
                if (!object) return null;

                return (
                  <Card key={objectId} className="overflow-hidden">
                    <CardHeader className="pb-3 bg-gray-50">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="text-lg">
                          {categoryIcons[object.category as keyof typeof categoryIcons]}
                        </span>
                        {object.name}
                        <Badge variant="outline" className="ml-2">
                          {objectTriggers.length} trigger{objectTriggers.length !== 1 ? 's' : ''}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="p-0">
                      <div className="space-y-3 p-6">
                        {objectTriggers.map((trigger) => (
                          <Card key={trigger.id} className="border border-gray-200">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="secondary" className="text-xs">
                                      {trigger.signal}
                                    </Badge>
                                    <span className="text-sm text-gray-600">→</span>
                                    <Badge variant="outline" className="text-xs">
                                      {trigger.condition}
                                    </Badge>
                                    <span className="text-sm text-gray-600">→</span>
                                    <Badge variant="default" className="text-xs flex items-center gap-1">
                                      {actionTypeIcons[trigger.action as keyof typeof actionTypeIcons]}
                                      {trigger.action}
                                    </Badge>
                                  </div>
                                  
                                  <div className="text-sm text-gray-600">
                                    When <strong>{trigger.signal}</strong> signal is received and condition <strong>{trigger.condition}</strong> is met, execute <strong>{trigger.action}</strong>
                                  </div>
                                  
                                  {!trigger.isActive && (
                                    <Badge variant="destructive" className="mt-2 text-xs">
                                      Inactive
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2 ml-4">
                                  {testMode && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => testTrigger(trigger.id)}
                                      className="flex items-center gap-1"
                                    >
                                      <Play className="w-3 h-3" />
                                      Test
                                    </Button>
                                  )}
                                  
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditTrigger(trigger)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  
                                  {onDeleteTrigger && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete Trigger</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete this trigger? This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction 
                                            onClick={() => onDeleteTrigger(trigger.id)}
                                            className="bg-red-600 hover:bg-red-700"
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </div>
                              </div>
                              
                              {/* Test Results */}
                              {testResults[trigger.id] !== undefined && (
                                <div className={`mt-3 p-2 rounded text-sm ${
                                  testResults[trigger.id] 
                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                                }`}>
                                  {testResults[trigger.id] ? '✅ Test passed' : '❌ Test failed'}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Add/Edit Trigger Dialog */}
      <Dialog open={isAddingTrigger} onOpenChange={setIsAddingTrigger}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTrigger ? 'Edit Trigger' : 'Add New Trigger'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(handleSubmitTrigger)} className="space-y-4">
            {/* Object Selection */}
            <div>
              <Label htmlFor="objectId">Target Object</Label>
              <Select value={watchedObjectId} onValueChange={handleObjectSelection}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select an object" />
                </SelectTrigger>
                <SelectContent>
                  {objects.map((object) => (
                    <SelectItem key={object.id} value={object.id}>
                      <div className="flex items-center gap-2">
                        <span>{categoryIcons[object.category as keyof typeof categoryIcons]}</span>
                        <span>{object.name}</span>
                        <Badge variant="outline" className="text-xs ml-2">
                          {object.category}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.objectId && (
                <p className="text-sm text-red-600 mt-1">{errors.objectId.message}</p>
              )}
            </div>

            {/* Signal Selection */}
            {selectedObject && (
              <div>
                <Label htmlFor="signal">Signal</Label>
                <Select value={watchedSignal} onValueChange={(value) => setValue('signal', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a signal" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedObject.signals.map((signal) => (
                      <SelectItem key={signal} value={signal}>
                        {signal}
                      </SelectItem>
                    ))}
                    {/* Common system signals */}
                    <SelectItem value="state_changed">state_changed</SelectItem>
                    <SelectItem value="behavior_executed">behavior_executed</SelectItem>
                    <SelectItem value="timer_elapsed">timer_elapsed</SelectItem>
                  </SelectContent>
                </Select>
                {errors.signal && (
                  <p className="text-sm text-red-600 mt-1">{errors.signal.message}</p>
                )}
              </div>
            )}

            {/* Condition */}
            <div>
              <Label htmlFor="condition">Condition</Label>
              <Textarea
                id="condition"
                {...register('condition')}
                placeholder="e.g., state == 'ready' or temperature > 100"
                className="mt-1"
              />
              <div className="text-xs text-gray-600 mt-1">
                Use object properties, states, or custom conditions. Examples: state == 'active', temperature > 50, contains('text')
              </div>
              {errors.condition && (
                <p className="text-sm text-red-600 mt-1">{errors.condition.message}</p>
              )}
            </div>

            {/* Action */}
            <div>
              <Label htmlFor="action">Action</Label>
              <Textarea
                id="action"
                {...register('action')}
                placeholder="e.g., change_state('completed') or emit_signal('ready')"
                className="mt-1"
              />
              <div className="text-xs text-gray-600 mt-1">
                Define what happens when the trigger fires. Examples: change_state('new_state'), emit_signal('signal_name'), show_feedback('message')
              </div>
              {errors.action && (
                <p className="text-sm text-red-600 mt-1">{errors.action.message}</p>
              )}
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-2">
              <Switch
                checked={watch('isActive')}
                onCheckedChange={(checked) => setValue('isActive', checked)}
                id="isActive"
              />
              <Label htmlFor="isActive">Active</Label>
              <span className="text-xs text-gray-600">(Inactive triggers won't fire)</span>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => { setIsAddingTrigger(false); resetForm(); }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingTrigger ? 'Update Trigger' : 'Add Trigger'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 