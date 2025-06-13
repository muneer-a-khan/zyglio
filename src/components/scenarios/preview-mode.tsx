"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, CheckCircle, XCircle, AlertCircle, Volume2, Mic } from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Types
import { 
  SmartObject, 
  ScenarioStep, 
  Trigger,
  PreviewModeProps,
  ObjectInteraction,
  SimulationSession 
} from '@/types/unified';

// Category icons
const categoryIcons = {
  'Ingredient': '🧪',
  'Tool': '🔧',
  'Equipment': '⚙️',
  'Person': '👤',
  'Location': '📍'
};

interface SimulationState {
  currentStepIndex: number;
  objectStates: { [objectId: string]: string };
  completedSteps: string[];
  failedSteps: string[];
  isRunning: boolean;
  startTime: Date | null;
  endTime: Date | null;
  score: number;
  interactions: ObjectInteraction[];
}

export function PreviewMode({ 
  objects, 
  scenarioSteps, 
  triggers,
  onObjectInteraction 
}: PreviewModeProps) {
  const [simulationState, setSimulationState] = useState<SimulationState>({
    currentStepIndex: 0,
    objectStates: {},
    completedSteps: [],
    failedSteps: [],
    isRunning: false,
    startTime: null,
    endTime: null,
    score: 0,
    interactions: []
  });

  const [showObjectPanel, setShowObjectPanel] = useState(true);
  const [selectedObject, setSelectedObject] = useState<SmartObject | null>(null);
  const [feedback, setFeedback] = useState<string>('');
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);

  // Initialize object states
  useEffect(() => {
    const initialStates: { [objectId: string]: string } = {};
    objects.forEach(obj => {
      if (obj.currentState) {
        initialStates[obj.id] = obj.currentState;
      } else if (obj.states.length > 0) {
        initialStates[obj.id] = obj.states[0];
      }
    });
    setSimulationState(prev => ({ ...prev, objectStates: initialStates }));
  }, [objects]);

  // Get current step
  const currentStep = scenarioSteps[simulationState.currentStepIndex];

  // Calculate simulation progress
  const progress = scenarioSteps.length > 0 ? 
    ((simulationState.completedSteps.length) / scenarioSteps.length) * 100 : 0;

  // Start simulation
  const startSimulation = useCallback(() => {
    setSimulationState(prev => ({
      ...prev,
      isRunning: true,
      startTime: new Date(),
      endTime: null,
      currentStepIndex: 0,
      completedSteps: [],
      failedSteps: [],
      score: 0,
      interactions: []
    }));
    setFeedback('Simulation started! Follow the steps to complete the scenario.');
  }, []);

  // Pause/Resume simulation
  const toggleSimulation = useCallback(() => {
    setSimulationState(prev => ({
      ...prev,
      isRunning: !prev.isRunning
    }));
  }, []);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    setSimulationState(prev => {
      const initialStates: { [objectId: string]: string } = {};
      objects.forEach(obj => {
        if (obj.currentState) {
          initialStates[obj.id] = obj.currentState;
        } else if (obj.states.length > 0) {
          initialStates[obj.id] = obj.states[0];
        }
      });

      return {
        currentStepIndex: 0,
        objectStates: initialStates,
        completedSteps: [],
        failedSteps: [],
        isRunning: false,
        startTime: null,
        endTime: null,
        score: 0,
        interactions: []
      };
    });
    setFeedback('');
    setSelectedObject(null);
  }, [objects]);

  // Execute trigger logic
  const executeTriggers = useCallback((objectId: string, signal: string, context: any = {}) => {
    const relevantTriggers = triggers.filter(trigger => 
      trigger.objectId === objectId && 
      trigger.signal === signal && 
      trigger.isActive
    );

    relevantTriggers.forEach(trigger => {
      try {
        // Simple condition evaluation (in production, use a proper expression evaluator)
        const conditionMet = evaluateCondition(trigger.condition, {
          object: objects.find(o => o.id === objectId),
          currentState: simulationState.objectStates[objectId],
          ...context
        });

        if (conditionMet) {
          executeAction(trigger.action, objectId);
        }
      } catch (error) {
        console.error('Error executing trigger:', error);
      }
    });
  }, [triggers, objects, simulationState.objectStates]);

  // Simple condition evaluator (in production, use a proper expression parser)
  const evaluateCondition = (condition: string, context: any): boolean => {
    try {
      // Replace common patterns
      let evaluatedCondition = condition
        .replace(/state\s*==\s*['"]([^'"]+)['"]/g, (match, state) => {
          return `"${context.currentState}" === "${state}"`;
        })
        .replace(/state\s*!=\s*['"]([^'"]+)['"]/g, (match, state) => {
          return `"${context.currentState}" !== "${state}"`;
        });

      // Simple evaluation (use a proper expression evaluator in production)
      return eval(evaluatedCondition);
    } catch (error) {
      console.warn('Failed to evaluate condition:', condition, error);
      return false;
    }
  };

  // Execute action
  const executeAction = (action: string, objectId: string) => {
    try {
      if (action.startsWith('change_state(')) {
        const stateMatch = action.match(/change_state\(['"]([^'"]+)['"]\)/);
        if (stateMatch) {
          const newState = stateMatch[1];
          setSimulationState(prev => ({
            ...prev,
            objectStates: {
              ...prev.objectStates,
              [objectId]: newState
            }
          }));
        }
      } else if (action.startsWith('emit_signal(')) {
        const signalMatch = action.match(/emit_signal\(['"]([^'"]+)['"]\)/);
        if (signalMatch) {
          const signal = signalMatch[1];
          executeTriggers(objectId, signal);
        }
      } else if (action.startsWith('show_feedback(')) {
        const feedbackMatch = action.match(/show_feedback\(['"]([^'"]+)['"]\)/);
        if (feedbackMatch) {
          setFeedback(feedbackMatch[1]);
        }
      } else if (action === 'complete_step') {
        completeCurrentStep();
      } else if (action === 'fail_step') {
        failCurrentStep();
      }
    } catch (error) {
      console.error('Error executing action:', error);
    }
  };

  // Handle object interaction
  const handleObjectInteraction = useCallback((objectId: string, action: string) => {
    const object = objects.find(o => o.id === objectId);
    if (!object) return;

    const interaction: ObjectInteraction = {
      id: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: 'current_session', // In production, this would be a proper session ID
      objectId,
      action,
      timestamp: new Date(),
      result: 'success', // This would be determined by the interaction logic
      feedback: `Interacted with ${object.name} using ${action}`
    };

    setSimulationState(prev => ({
      ...prev,
      interactions: [...prev.interactions, interaction]
    }));

    // Call the callback if provided
    if (onObjectInteraction) {
      onObjectInteraction(interaction);
    }

    // Execute relevant triggers
    executeTriggers(objectId, 'behavior_executed', { action });

    // Check if this interaction helps complete the current step
    if (currentStep && currentStep.requiredObjects.includes(objectId)) {
      const requiredActions = currentStep.requiredActions;
      if (requiredActions.length === 0 || requiredActions.includes(action)) {
        // Check if all required objects have been interacted with
        const stepInteractions = simulationState.interactions.filter(
          i => currentStep.requiredObjects.includes(i.objectId)
        );
        
        if (stepInteractions.length >= currentStep.requiredObjects.length) {
          completeCurrentStep();
        }
      }
    }
  }, [objects, currentStep, simulationState.interactions, onObjectInteraction, executeTriggers]);

  // Complete current step
  const completeCurrentStep = useCallback(() => {
    if (!currentStep) return;

    setSimulationState(prev => ({
      ...prev,
      completedSteps: [...prev.completedSteps, currentStep.id],
      currentStepIndex: prev.currentStepIndex + 1,
      score: prev.score + (currentStep.isCheckpoint ? 20 : 10)
    }));

    setFeedback(currentStep.feedback || 'Step completed successfully!');

    // Check if simulation is complete
    if (simulationState.currentStepIndex + 1 >= scenarioSteps.length) {
      setSimulationState(prev => ({
        ...prev,
        isRunning: false,
        endTime: new Date()
      }));
      setFeedback('🎉 Scenario completed successfully!');
    }
  }, [currentStep, simulationState.currentStepIndex, scenarioSteps.length]);

  // Fail current step
  const failCurrentStep = useCallback(() => {
    if (!currentStep) return;

    setSimulationState(prev => ({
      ...prev,
      failedSteps: [...prev.failedSteps, currentStep.id],
      score: Math.max(0, prev.score - 5)
    }));

    setFeedback('❌ Step failed. Try again!');
  }, [currentStep]);

  // Play step audio
  const playStepAudio = useCallback((stepId: string) => {
    setIsPlayingAudio(stepId);
    // In production, integrate with actual audio playback
    setTimeout(() => setIsPlayingAudio(null), 3000);
  }, []);

  // Check if object is required for current step
  const isObjectRequired = (objectId: string): boolean => {
    return currentStep ? currentStep.requiredObjects.includes(objectId) : false;
  };

  // Get object interaction buttons
  const getObjectActions = (object: SmartObject) => {
    return object.behaviors.length > 0 ? object.behaviors : ['interact', 'inspect', 'use'];
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-6 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Play className="w-5 h-5" />
              Scenario Preview
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Interactive simulation of your scenario
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowObjectPanel(!showObjectPanel)}
            >
              {showObjectPanel ? 'Hide Objects' : 'Show Objects'}
            </Button>
            
            {!simulationState.isRunning ? (
              <Button onClick={startSimulation} className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                Start Simulation
              </Button>
            ) : (
              <Button onClick={toggleSimulation} variant="outline" className="flex items-center gap-2">
                <Pause className="w-4 h-4" />
                Pause
              </Button>
            )}
            
            <Button onClick={resetSimulation} variant="outline" className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
          </div>
        </div>

        {/* Progress and Stats */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span>Progress</span>
                <span>{simulationState.completedSteps.length}/{scenarioSteps.length} steps</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            <div className="text-sm font-medium">
              Score: {simulationState.score}
            </div>
          </div>

          {feedback && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{feedback}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Scenario Steps */}
        <div className={`${showObjectPanel ? 'w-2/3' : 'w-full'} border-r border-gray-200`}>
          <div className="p-4 border-b border-gray-200 bg-white">
            <h3 className="font-medium text-gray-900">Scenario Steps</h3>
          </div>
          
          <ScrollArea className="h-full bg-white">
            <div className="p-6 space-y-4">
              {scenarioSteps.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Steps Defined</h3>
                  <p className="text-gray-600">
                    Add some scenario steps to preview the simulation.
                  </p>
                </div>
              ) : (
                scenarioSteps.map((step, index) => {
                  const isCurrentStep = index === simulationState.currentStepIndex;
                  const isCompleted = simulationState.completedSteps.includes(step.id);
                  const isFailed = simulationState.failedSteps.includes(step.id);
                  
                  return (
                    <Card 
                      key={step.id} 
                      className={`transition-all ${
                        isCurrentStep ? 'ring-2 ring-blue-500 bg-blue-50' :
                        isCompleted ? 'bg-green-50 border-green-200' :
                        isFailed ? 'bg-red-50 border-red-200' : ''
                      }`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                              isCompleted ? 'bg-green-600 text-white' :
                              isFailed ? 'bg-red-600 text-white' :
                              isCurrentStep ? 'bg-blue-600 text-white' :
                              'bg-gray-300 text-gray-600'
                            }`}>
                              {isCompleted ? <CheckCircle className="w-4 h-4" /> :
                               isFailed ? <XCircle className="w-4 h-4" /> :
                               index + 1}
                            </div>
                            
                            <div>
                              <CardTitle className="text-base">{step.instruction}</CardTitle>
                              {step.isCheckpoint && (
                                <Badge variant="outline" className="mt-1">
                                  Checkpoint
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {step.transcript && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => playStepAudio(step.id)}
                              className={isPlayingAudio === step.id ? 'text-blue-600' : ''}
                            >
                              <Volume2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        {/* Required Objects */}
                        {step.requiredObjects.length > 0 && (
                          <div className="mb-3">
                            <div className="text-xs font-medium text-gray-600 mb-2">Required Objects:</div>
                            <div className="flex flex-wrap gap-2">
                              {step.requiredObjects.map(objId => {
                                const obj = objects.find(o => o.id === objId);
                                return obj ? (
                                  <Badge 
                                    key={objId} 
                                    variant="outline" 
                                    className="text-xs"
                                  >
                                    {categoryIcons[obj.category as keyof typeof categoryIcons]} {obj.name}
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}
                        
                        {/* Required Actions */}
                        {step.requiredActions.length > 0 && (
                          <div className="mb-3">
                            <div className="text-xs font-medium text-gray-600 mb-2">Required Actions:</div>
                            <div className="flex flex-wrap gap-2">
                              {step.requiredActions.map((action, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {action}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Step Instructions for Current Step */}
                        {isCurrentStep && simulationState.isRunning && (
                          <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                            <div className="text-sm font-medium text-blue-900 mb-1">
                              Current Step Instructions:
                            </div>
                            <div className="text-sm text-blue-800">
                              {step.instruction}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Object Interaction Panel */}
        {showObjectPanel && (
          <div className="w-1/3 bg-white">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Interactive Objects</h3>
              <p className="text-sm text-gray-600">Click objects to interact with them</p>
            </div>
            
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {objects.map(object => {
                  const isRequired = isObjectRequired(object.id);
                  const currentState = simulationState.objectStates[object.id];
                  
                  return (
                    <Card 
                      key={object.id} 
                      className={`cursor-pointer transition-all ${
                        isRequired ? 'ring-2 ring-orange-400 bg-orange-50' : 'hover:shadow-md'
                      } ${selectedObject?.id === object.id ? 'ring-2 ring-blue-500' : ''}`}
                      onClick={() => setSelectedObject(selectedObject?.id === object.id ? null : object)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {categoryIcons[object.category as keyof typeof categoryIcons]}
                            </span>
                            <div>
                              <div className="font-medium text-sm">{object.name}</div>
                              <div className="text-xs text-gray-600">{object.category}</div>
                            </div>
                          </div>
                          
                          {isRequired && (
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                        
                        {/* Current State */}
                        {currentState && (
                          <div className="mb-2">
                            <Badge variant="secondary" className="text-xs">
                              State: {currentState}
                            </Badge>
                          </div>
                        )}
                        
                        {/* Action Buttons */}
                        {selectedObject?.id === object.id && simulationState.isRunning && (
                          <div className="mt-3 space-y-2">
                            <div className="text-xs font-medium text-gray-600">Actions:</div>
                            <div className="flex flex-wrap gap-2">
                              {getObjectActions(object).map(action => (
                                <Button
                                  key={action}
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleObjectInteraction(object.id, action);
                                  }}
                                  className="text-xs"
                                >
                                  {action}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                
                {objects.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No objects available</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Create some objects to interact with them in the simulation.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
} 