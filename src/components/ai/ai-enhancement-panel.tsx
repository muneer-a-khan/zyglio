"use client";

import React, { useState } from 'react';
import { Bot, Sparkles, Brain, Target, Zap, Volume2, RefreshCw, Loader2 } from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Services
import { aiService, ScenarioEnhancement, ObjectEnhancement, ContentGeneration } from '@/lib/ai-service';
import { voiceService } from '@/lib/voice-service';

// Types
import { SmartObject, ScenarioStep, Trigger, LearningTask } from '@/types/unified';

interface AIEnhancementPanelProps {
  objects: SmartObject[];
  scenarioSteps: ScenarioStep[];
  triggers: Trigger[];
  currentTask?: LearningTask;
  onApplyEnhancements: (enhancements: {
    objects?: SmartObject[];
    steps?: ScenarioStep[];
    triggers?: Trigger[];
  }) => void;
}

export function AIEnhancementPanel({
  objects,
  scenarioSteps,
  triggers,
  currentTask,
  onApplyEnhancements
}: AIEnhancementPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('scenario');
  const [selectedObject, setSelectedObject] = useState<SmartObject | null>(null);
  
  // Enhancement results
  const [scenarioEnhancement, setScenarioEnhancement] = useState<ScenarioEnhancement | null>(null);
  const [objectEnhancement, setObjectEnhancement] = useState<ObjectEnhancement | null>(null);
  const [contentGeneration, setContentGeneration] = useState<ContentGeneration | null>(null);
  
  // Content generation options
  const [contentType, setContentType] = useState<'instruction' | 'feedback' | 'description' | 'explanation'>('instruction');
  const [contentTone, setContentTone] = useState<'formal' | 'casual' | 'instructional' | 'conversational'>('instructional');
  const [contentContext, setContentContext] = useState('');

  // Error handling
  const [error, setError] = useState<string | null>(null);

  // Clear error on new operations
  const clearError = () => setError(null);

  // Enhance scenario with AI
  const handleEnhanceScenario = async () => {
    if (objects.length === 0 || scenarioSteps.length === 0) {
      setError('Please create some objects and scenario steps first.');
      return;
    }

    setIsLoading(true);
    clearError();

    try {
      const learningObjectives = currentTask?.objectives || [];
      const enhancement = await aiService.enhanceScenario(objects, scenarioSteps, learningObjectives);
      setScenarioEnhancement(enhancement);
    } catch (error) {
      console.error('Scenario enhancement failed:', error);
      setError('Failed to enhance scenario. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Enhance selected object with AI
  const handleEnhanceObject = async (object: SmartObject) => {
    setIsLoading(true);
    clearError();
    setSelectedObject(object);

    try {
      const enhancement = await aiService.enhanceObject(object);
      setObjectEnhancement(enhancement);
    } catch (error) {
      console.error('Object enhancement failed:', error);
      setError('Failed to enhance object. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate content with AI
  const handleGenerateContent = async () => {
    if (!contentContext.trim()) {
      setError('Please provide context for content generation.');
      return;
    }

    setIsLoading(true);
    clearError();

    try {
      const content = await aiService.generateContent(contentType, contentContext, contentTone);
      setContentGeneration(content);
    } catch (error) {
      console.error('Content generation failed:', error);
      setError('Failed to generate content. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate speech for content
  const handleGenerateSpeech = async (text: string) => {
    try {
      const { audioUrl } = await voiceService.generateSpeech(text);
      await voiceService.playAudio(audioUrl);
    } catch (error) {
      console.error('Speech generation failed:', error);
      setError('Failed to generate speech. Please check your ElevenLabs API key.');
    }
  };

  // Apply scenario enhancements
  const applyScenarioEnhancements = () => {
    if (!scenarioEnhancement) return;

    onApplyEnhancements({
      steps: scenarioEnhancement.improvedSteps,
      triggers: [...triggers, ...scenarioEnhancement.suggestedTriggers]
    });

    setScenarioEnhancement(null);
  };

  // Apply object enhancements
  const applyObjectEnhancements = () => {
    if (!objectEnhancement || !selectedObject) return;

    const enhancedObject: SmartObject = {
      ...selectedObject,
      states: [...selectedObject.states, ...objectEnhancement.suggestedStates],
      behaviors: [...selectedObject.behaviors, ...objectEnhancement.suggestedBehaviors],
      signals: [...selectedObject.signals, ...objectEnhancement.suggestedSignals],
      attributes: { ...selectedObject.attributes, ...objectEnhancement.improvedAttributes }
    };

    const updatedObjects = objects.map(obj => 
      obj.id === selectedObject.id ? enhancedObject : obj
    );

    onApplyEnhancements({ objects: updatedObjects });
    setObjectEnhancement(null);
    setSelectedObject(null);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-600" />
              AI Enhancement Studio
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Powered by DeepSeek AI • Intelligent content generation and optimization
            </p>
          </div>
          
          <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-800">
            <Sparkles className="w-3 h-3 mr-1" />
            AI Powered
          </Badge>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mt-4 border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-3 m-6 mb-0">
            <TabsTrigger value="scenario" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Scenario Enhancement
            </TabsTrigger>
            <TabsTrigger value="objects" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Object Enhancement
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Content Generation
            </TabsTrigger>
          </TabsList>

          {/* Scenario Enhancement Tab */}
          <TabsContent value="scenario" className="p-6 h-full">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Scenario Analysis & Enhancement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">
                          Analyze your scenario and get AI-powered improvements
                        </p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>{objects.length} objects</span>
                          <span>{scenarioSteps.length} steps</span>
                          <span>{triggers.length} triggers</span>
                        </div>
                      </div>
                      <Button 
                        onClick={handleEnhanceScenario}
                        disabled={isLoading || objects.length === 0 || scenarioSteps.length === 0}
                        className="flex items-center gap-2"
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        {isLoading ? 'Analyzing...' : 'Enhance Scenario'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Enhancement Results */}
              {scenarioEnhancement && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      AI Enhancement Results
                      <Button 
                        onClick={applyScenarioEnhancements}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Apply Changes
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Difficulty & Duration */}
                      <div className="flex gap-4">
                        <Badge variant="outline">
                          Difficulty: {scenarioEnhancement.difficultyRating}/10
                        </Badge>
                        <Badge variant="outline">
                          Duration: {scenarioEnhancement.estimatedDuration} min
                        </Badge>
                      </div>

                      {/* Learning Objectives */}
                      {scenarioEnhancement.learningObjectives.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Enhanced Learning Objectives:</h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {scenarioEnhancement.learningObjectives.map((objective, i) => (
                              <li key={i}>• {objective}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recommendations */}
                      {scenarioEnhancement.recommendations.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">AI Recommendations:</h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {scenarioEnhancement.recommendations.map((rec, i) => (
                              <li key={i}>• {rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Suggested Triggers */}
                      {scenarioEnhancement.suggestedTriggers.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Suggested Triggers:</h4>
                          <div className="text-sm text-gray-600">
                            {scenarioEnhancement.suggestedTriggers.length} new triggers will be added
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Object Enhancement Tab */}
          <TabsContent value="objects" className="p-6 h-full">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Select Object to Enhance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {objects.length === 0 ? (
                        <p className="text-sm text-gray-500">No objects created yet.</p>
                      ) : (
                        objects.map(object => (
                          <Card 
                            key={object.id}
                            className={`cursor-pointer transition-all ${
                              selectedObject?.id === object.id ? 'ring-2 ring-purple-500' : 'hover:shadow-md'
                            }`}
                            onClick={() => handleEnhanceObject(object)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="font-medium text-sm">{object.name}</h3>
                                  <p className="text-xs text-gray-600">{object.category}</p>
                                </div>
                                <div className="flex gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {object.states.length} states
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {object.behaviors.length} behaviors
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Object Enhancement Results */}
              {objectEnhancement && selectedObject && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      Enhancement for "{selectedObject.name}"
                      <Button 
                        onClick={applyObjectEnhancements}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Apply Changes
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Suggested States */}
                      {objectEnhancement.suggestedStates.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Suggested States:</h4>
                          <div className="flex flex-wrap gap-2">
                            {objectEnhancement.suggestedStates.map((state, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                + {state}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggested Behaviors */}
                      {objectEnhancement.suggestedBehaviors.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Suggested Behaviors:</h4>
                          <div className="flex flex-wrap gap-2">
                            {objectEnhancement.suggestedBehaviors.map((behavior, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                + {behavior}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Usage Recommendations */}
                      {objectEnhancement.usageRecommendations.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Usage Recommendations:</h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {objectEnhancement.usageRecommendations.map((rec, i) => (
                              <li key={i}>• {rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Content Generation Tab */}
          <TabsContent value="content" className="p-6 h-full">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">AI Content Generator</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Content Type & Tone */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Content Type</label>
                        <Select value={contentType} onValueChange={(value: any) => setContentType(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="instruction">Instruction</SelectItem>
                            <SelectItem value="feedback">Feedback</SelectItem>
                            <SelectItem value="description">Description</SelectItem>
                            <SelectItem value="explanation">Explanation</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Tone</label>
                        <Select value={contentTone} onValueChange={(value: any) => setContentTone(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="instructional">Instructional</SelectItem>
                            <SelectItem value="conversational">Conversational</SelectItem>
                            <SelectItem value="formal">Formal</SelectItem>
                            <SelectItem value="casual">Casual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Context Input */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Context</label>
                      <Textarea
                        placeholder="Describe what you need content for (e.g., 'Instructions for operating a centrifuge in a lab setting')"
                        value={contentContext}
                        onChange={(e) => setContentContext(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <Button 
                      onClick={handleGenerateContent}
                      disabled={isLoading || !contentContext.trim()}
                      className="w-full flex items-center gap-2"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Brain className="w-4 h-4" />
                      )}
                      {isLoading ? 'Generating...' : 'Generate Content'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Generated Content */}
              {contentGeneration && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      Generated Content
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateSpeech(contentGeneration.generatedText)}
                          className="flex items-center gap-1"
                        >
                          <Volume2 className="w-3 h-3" />
                          Listen
                        </Button>
                        <Badge variant="outline">
                          {Math.round(contentGeneration.confidence * 100)}% confidence
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Main Generated Text */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm leading-relaxed">{contentGeneration.generatedText}</p>
                      </div>

                      {/* Alternative Versions */}
                      {contentGeneration.alternatives.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Alternative Versions:</h4>
                          <div className="space-y-2">
                            {contentGeneration.alternatives.map((alt, i) => (
                              <div key={i} className="p-3 bg-blue-50 rounded border-l-4 border-blue-200">
                                <p className="text-sm text-gray-700">{alt}</p>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleGenerateSpeech(alt)}
                                  className="mt-2 h-6 px-2 text-xs"
                                >
                                  <Volume2 className="w-3 h-3 mr-1" />
                                  Listen
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 