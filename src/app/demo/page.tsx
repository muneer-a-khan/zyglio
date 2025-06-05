"use client";

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Import our migrated components
import { ObjectDefinitionPanel } from '@/components/objects/object-definition-panel';
import { ObjectLibrary } from '@/components/objects/object-library';
import { ScenarioFlowBuilder } from '@/components/scenarios/scenario-flow-builder';
import { TriggerLogicEditor } from '@/components/scenarios/trigger-logic-editor';
import { PreviewMode } from '@/components/scenarios/preview-mode';
import { AIEnhancementPanel } from '@/components/ai/ai-enhancement-panel';
import MediaUpload from '@/components/media/media-upload';
import MediaLibrary from '@/components/media/media-library';

// Import types
import { 
  SmartObject, 
  ScenarioStep, 
  Trigger, 
  ObjectInteraction 
} from '@/types/unified';
import { MediaFile } from '@/lib/storage-service';

export default function DemoPage() {
  // State for all components
  const [objects, setObjects] = useState<SmartObject[]>([]);
  const [scenarioSteps, setScenarioSteps] = useState<ScenarioStep[]>([]);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [activeTab, setActiveTab] = useState('objects');

  // Demo context IDs
  const demoTaskId = 'demo-task-001';
  const demoProcedureId = 'demo-procedure-001';
  const demoScenarioId = 'demo-scenario-001';

  // Object handlers
  const handleAddObject = (object: SmartObject) => {
    setObjects(prev => [...prev, object]);
  };

  const handleUpdateObject = (id: string, updatedObject: SmartObject) => {
    setObjects(prev => prev.map(obj => obj.id === id ? updatedObject : obj));
  };

  const handleDeleteObject = (id: string) => {
    setObjects(prev => prev.filter(obj => obj.id !== id));
    // Remove object from scenario steps
    setScenarioSteps(prev => prev.map(step => ({
      ...step,
      requiredObjects: step.requiredObjects.filter(objId => objId !== id)
    })));
    // Remove related triggers
    setTriggers(prev => prev.filter(trigger => trigger.objectId !== id));
  };

  const handleSelectObjects = (objectIds: string[]) => {
    setSelectedObjects(objectIds);
  };

  // Scenario step handlers
  const handleAddStep = (step: ScenarioStep) => {
    setScenarioSteps(prev => [...prev, step]);
  };

  const handleUpdateStep = (id: string, updatedStep: ScenarioStep) => {
    setScenarioSteps(prev => prev.map(step => step.id === id ? updatedStep : step));
  };

  const handleDeleteStep = (id: string) => {
    setScenarioSteps(prev => prev.filter(step => step.id !== id));
  };

  // Trigger handlers
  const handleAddTrigger = (trigger: Trigger) => {
    setTriggers(prev => [...prev, trigger]);
  };

  const handleUpdateTrigger = (id: string, updatedTrigger: Trigger) => {
    setTriggers(prev => prev.map(trigger => trigger.id === id ? updatedTrigger : trigger));
  };

  const handleDeleteTrigger = (id: string) => {
    setTriggers(prev => prev.filter(trigger => trigger.id !== id));
  };

  // Object interaction handler
  const handleObjectInteraction = (interaction: ObjectInteraction) => {
    console.log('Object interaction:', interaction);
    // In production, this would update analytics, trigger events, etc.
  };

  // AI enhancement handler
  const handleApplyEnhancements = (enhancements: {
    objects?: SmartObject[];
    steps?: ScenarioStep[];
    triggers?: Trigger[];
  }) => {
    if (enhancements.objects) {
      setObjects(enhancements.objects);
    }
    if (enhancements.steps) {
      setScenarioSteps(enhancements.steps);
    }
    if (enhancements.triggers) {
      setTriggers(enhancements.triggers);
    }
  };

  // Media handlers
  const handleMediaUpload = (uploadedFiles: MediaFile[]) => {
    setMediaFiles(prev => [...uploadedFiles, ...prev]);
  };

  const handleMediaDelete = (file: MediaFile) => {
    setMediaFiles(prev => prev.filter(f => f.id !== file.id));
  };

  const handleBulkMediaDelete = (filesToDelete: MediaFile[]) => {
    const deleteIds = new Set(filesToDelete.map(f => f.id));
    setMediaFiles(prev => prev.filter(f => !deleteIds.has(f.id)));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Zyglio + Objects-Scenarios Integration Demo
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Unified platform for creating intelligent, voice-enhanced training scenarios
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="bg-green-50 border-green-200 text-green-800">
                  ✅ Migration Complete
                </Badge>
                <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-800">
                  {objects.length} Objects
                </Badge>
                <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-800">
                  {scenarioSteps.length} Steps
                </Badge>
                <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-800">
                  {triggers.length} Triggers
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-7 mb-6">
            <TabsTrigger value="objects" className="flex items-center gap-2">
              🧪 Objects ({objects.length})
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="flex items-center gap-2">
              📋 Scenarios ({scenarioSteps.length})
            </TabsTrigger>
            <TabsTrigger value="triggers" className="flex items-center gap-2">
              ⚡ Triggers ({triggers.length})
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              🤖 AI Studio
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-2">
              📁 Media Library
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              ▶️ Preview
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              📊 Overview
            </TabsTrigger>
          </TabsList>

          {/* Objects Tab */}
          <TabsContent value="objects" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-16rem)]">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Create Objects</CardTitle>
                </CardHeader>
                <CardContent className="h-full p-0">
                  <ObjectDefinitionPanel
                    onAddObject={handleAddObject}
                    currentTaskId={demoTaskId}
                  />
                </CardContent>
              </Card>
              
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Object Library</CardTitle>
                </CardHeader>
                <CardContent className="h-full p-0">
                  <ObjectLibrary
                    objects={objects}
                    onUpdateObject={handleUpdateObject}
                    onDeleteObject={handleDeleteObject}
                    onSelectObjects={handleSelectObjects}
                    selectedObjects={selectedObjects}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Scenarios Tab */}
          <TabsContent value="scenarios" className="h-[calc(100vh-16rem)]">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Scenario Flow Builder</CardTitle>
              </CardHeader>
              <CardContent className="h-full p-0">
                <ScenarioFlowBuilder
                  objects={objects}
                  scenarioSteps={scenarioSteps}
                  onAddStep={handleAddStep}
                  onUpdateStep={handleUpdateStep}
                  onDeleteStep={handleDeleteStep}
                  currentProcedureId={demoProcedureId}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Triggers Tab */}
          <TabsContent value="triggers" className="h-[calc(100vh-16rem)]">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Trigger Logic Editor</CardTitle>
              </CardHeader>
              <CardContent className="h-full p-0">
                <TriggerLogicEditor
                  objects={objects}
                  triggers={triggers}
                  onAddTrigger={handleAddTrigger}
                  onUpdateTrigger={handleUpdateTrigger}
                  onDeleteTrigger={handleDeleteTrigger}
                  currentScenarioId={demoScenarioId}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Enhancement Tab */}
          <TabsContent value="ai" className="h-[calc(100vh-16rem)]">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>AI Enhancement Studio</CardTitle>
              </CardHeader>
              <CardContent className="h-full p-0">
                <AIEnhancementPanel
                  objects={objects}
                  scenarioSteps={scenarioSteps}
                  triggers={triggers}
                  onApplyEnhancements={handleApplyEnhancements}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upload Media Files</CardTitle>
                </CardHeader>
                <CardContent>
                  <MediaUpload
                    userId="demo-user"
                    onUploadComplete={handleMediaUpload}
                    onUploadError={(error) => console.error('Upload error:', error)}
                    multiple={true}
                    options={{
                      maxSize: 100 * 1024 * 1024, // 100MB
                      extractMetadata: true,
                      allowedTypes: ['*']
                    }}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Media Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{mediaFiles.length}</div>
                      <div className="text-sm text-gray-600">Total Files</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {mediaFiles.filter(f => f.type.startsWith('audio/')).length}
                      </div>
                      <div className="text-sm text-gray-600">Audio Files</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {mediaFiles.filter(f => f.type.startsWith('image/')).length}
                      </div>
                      <div className="text-sm text-gray-600">Images</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {mediaFiles.filter(f => f.type.startsWith('video/')).length}
                      </div>
                      <div className="text-sm text-gray-600">Videos</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Media Library</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <MediaLibrary
                  files={mediaFiles}
                  onFileDelete={handleMediaDelete}
                  onBulkDelete={handleBulkMediaDelete}
                  selectable={true}
                  multiSelect={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="h-[calc(100vh-16rem)]">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Interactive Preview</CardTitle>
              </CardHeader>
              <CardContent className="h-full p-0">
                <PreviewMode
                  objects={objects}
                  scenarioSteps={scenarioSteps}
                  triggers={triggers}
                  onObjectInteraction={handleObjectInteraction}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* System Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">System Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Migration Status</span>
                      <Badge variant="default" className="bg-green-600">Complete</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Voice Service</span>
                      <Badge variant="outline" className="text-green-600 border-green-600">Ready</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Components</span>
                      <Badge variant="outline">5/5 Migrated</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Object Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Object Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Objects</span>
                      <Badge variant="outline">{objects.length}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">With Behaviors</span>
                      <Badge variant="outline">
                        {objects.filter(obj => obj.behaviors.length > 0).length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">With Signals</span>
                      <Badge variant="outline">
                        {objects.filter(obj => obj.signals.length > 0).length}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Scenario Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Scenario Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Steps</span>
                      <Badge variant="outline">{scenarioSteps.length}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Checkpoints</span>
                      <Badge variant="outline">
                        {scenarioSteps.filter(step => step.isCheckpoint).length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Active Triggers</span>
                      <Badge variant="outline">
                        {triggers.filter(trigger => trigger.isActive).length}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Feature Highlights */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Migration Achievements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">✅ Completed Features</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Smart object definition with states and behaviors</li>
                      <li>• Visual scenario flow building</li>
                      <li>• Interactive trigger logic system</li>
                      <li>• Real-time simulation preview</li>
                      <li>• Production-ready voice recording service</li>
                      <li>• Unified type system and validation</li>
                      <li>• Mobile-responsive design</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">🚀 Ready for Next Phase</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Database schema implementation</li>
                      <li>• Supabase authentication integration</li>
                      <li>• AI-powered content enhancement</li>
                      <li>• Advanced analytics and reporting</li>
                      <li>• Real-time collaboration features</li>
                      <li>• Performance optimization</li>
                      <li>• Production deployment</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button 
                    onClick={() => setActiveTab('objects')}
                    variant="outline"
                  >
                    Create Your First Object
                  </Button>
                  <Button 
                    onClick={() => setActiveTab('scenarios')}
                    variant="outline"
                    disabled={objects.length === 0}
                  >
                    Build a Scenario
                  </Button>
                  <Button 
                    onClick={() => setActiveTab('triggers')}
                    variant="outline"
                    disabled={objects.length === 0}
                  >
                    Add Triggers
                  </Button>
                  <Button 
                    onClick={() => setActiveTab('ai')}
                    variant="outline"
                    disabled={objects.length === 0 || scenarioSteps.length === 0}
                    className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                  >
                    🤖 AI Enhance
                  </Button>
                  <Button 
                    onClick={() => setActiveTab('preview')}
                    variant="outline"
                    disabled={scenarioSteps.length === 0}
                  >
                    Preview Simulation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 