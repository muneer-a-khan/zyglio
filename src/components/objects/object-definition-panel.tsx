"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, X, Settings, Zap } from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

// Types
import { 
  SmartObject, 
  ObjectDefinitionPanelProps,
  SmartObjectFormData,
  OBJECT_CATEGORIES 
} from '@/types/unified';
import { generateId } from '@/lib/utils';

// Form Schema
const smartObjectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.enum(['Ingredient', 'Tool', 'Equipment', 'Person', 'Location']),
  attributes: z.record(z.any()).optional().default({}),
  states: z.array(z.string()).default([]),
  behaviors: z.array(z.string()).default([]),
  signals: z.array(z.string()).default([]),
  currentState: z.string().optional(),
});

export function ObjectDefinitionPanel({ 
  onAddObject, 
  objects, 
  currentTaskId 
}: ObjectDefinitionPanelProps) {
  const [newState, setNewState] = useState('');
  const [newBehavior, setNewBehavior] = useState('');
  const [newSignal, setNewSignal] = useState('');
  const [attributeKey, setAttributeKey] = useState('');
  const [attributeValue, setAttributeValue] = useState('');
  const [customAttributes, setCustomAttributes] = useState<Record<string, any>>({});

  const form = useForm<SmartObjectFormData>({
    resolver: zodResolver(smartObjectSchema),
    defaultValues: {
      name: '',
      category: 'Tool',
      attributes: {},
      states: [],
      behaviors: [],
      signals: [],
      currentState: '',
    },
  });

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = form;
  const watchedStates = watch('states') || [];
  const watchedBehaviors = watch('behaviors') || [];
  const watchedSignals = watch('signals') || [];

  const addState = () => {
    if (newState.trim()) {
      const currentStates = watch('states') || [];
      setValue('states', [...currentStates, newState.trim()]);
      setNewState('');
    }
  };

  const removeState = (index: number) => {
    const currentStates = watch('states') || [];
    setValue('states', currentStates.filter((_, i) => i !== index));
  };

  const addBehavior = () => {
    if (newBehavior.trim()) {
      const currentBehaviors = watch('behaviors') || [];
      setValue('behaviors', [...currentBehaviors, newBehavior.trim()]);
      setNewBehavior('');
    }
  };

  const removeBehavior = (index: number) => {
    const currentBehaviors = watch('behaviors') || [];
    setValue('behaviors', currentBehaviors.filter((_, i) => i !== index));
  };

  const addSignal = () => {
    if (newSignal.trim()) {
      const currentSignals = watch('signals') || [];
      setValue('signals', [...currentSignals, newSignal.trim()]);
      setNewSignal('');
    }
  };

  const removeSignal = (index: number) => {
    const currentSignals = watch('signals') || [];
    setValue('signals', currentSignals.filter((_, i) => i !== index));
  };

  const addAttribute = () => {
    if (attributeKey.trim() && attributeValue.trim()) {
      const newAttributes = {
        ...customAttributes,
        [attributeKey.trim()]: attributeValue.trim()
      };
      setCustomAttributes(newAttributes);
      setValue('attributes', newAttributes);
      setAttributeKey('');
      setAttributeValue('');
    }
  };

  const removeAttribute = (key: string) => {
    const newAttributes = { ...customAttributes };
    delete newAttributes[key];
    setCustomAttributes(newAttributes);
    setValue('attributes', newAttributes);
  };

  const onSubmit = (data: SmartObjectFormData) => {
    const newObject: SmartObject = {
      id: generateId('object'),
      name: data.name,
      category: data.category,
      attributes: data.attributes || {},
      states: data.states || [],
      behaviors: data.behaviors || [],
      signals: data.signals || [],
      currentState: data.currentState || (data.states && data.states.length > 0 ? data.states[0] : undefined),
      taskId: currentTaskId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    onAddObject(newObject);
    reset();
    setCustomAttributes({});
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Smart Objects
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Define objects that will interact in your scenarios
        </p>
      </div>

      <ScrollArea className="flex-1 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Object Name</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="e.g., Mixing Bowl, Wrench, Lab Coat"
                  className="mt-1"
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={watch('category')}
                  onValueChange={(value: any) => setValue('category', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {OBJECT_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Object Configuration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Object Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="states" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="states">States</TabsTrigger>
                  <TabsTrigger value="behaviors">Behaviors</TabsTrigger>
                  <TabsTrigger value="signals">Signals</TabsTrigger>
                </TabsList>

                <TabsContent value="states" className="mt-4">
                  <div className="space-y-3">
                    <Label>Object States</Label>
                    <p className="text-xs text-gray-600">
                      Define the different states this object can be in
                    </p>
                    
                    <div className="flex gap-2">
                      <Input
                        value={newState}
                        onChange={(e) => setNewState(e.target.value)}
                        placeholder="e.g., empty, full, hot, cold"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addState())}
                      />
                      <Button type="button" onClick={addState} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {watchedStates.map((state, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {state}
                          <X
                            className="w-3 h-3 cursor-pointer"
                            onClick={() => removeState(index)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="behaviors" className="mt-4">
                  <div className="space-y-3">
                    <Label>Object Behaviors</Label>
                    <p className="text-xs text-gray-600">
                      Define actions this object can perform
                    </p>
                    
                    <div className="flex gap-2">
                      <Input
                        value={newBehavior}
                        onChange={(e) => setNewBehavior(e.target.value)}
                        placeholder="e.g., heat, cool, mix, measure"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBehavior())}
                      />
                      <Button type="button" onClick={addBehavior} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {watchedBehaviors.map((behavior, index) => (
                        <Badge key={index} variant="outline" className="flex items-center gap-1">
                          {behavior}
                          <X
                            className="w-3 h-3 cursor-pointer"
                            onClick={() => removeBehavior(index)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="signals" className="mt-4">
                  <div className="space-y-3">
                    <Label>Object Signals</Label>
                    <p className="text-xs text-gray-600">
                      Define signals this object can emit or receive
                    </p>
                    
                    <div className="flex gap-2">
                      <Input
                        value={newSignal}
                        onChange={(e) => setNewSignal(e.target.value)}
                        placeholder="e.g., temperature_changed, timer_complete"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSignal())}
                      />
                      <Button type="button" onClick={addSignal} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {watchedSignals.map((signal, index) => (
                        <Badge key={index} variant="destructive" className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {signal}
                          <X
                            className="w-3 h-3 cursor-pointer"
                            onClick={() => removeSignal(index)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Custom Attributes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Custom Attributes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={attributeKey}
                  onChange={(e) => setAttributeKey(e.target.value)}
                  placeholder="Attribute name"
                  className="flex-1"
                />
                <Input
                  value={attributeValue}
                  onChange={(e) => setAttributeValue(e.target.value)}
                  placeholder="Value"
                  className="flex-1"
                />
                <Button type="button" onClick={addAttribute} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {Object.entries(customAttributes).length > 0 && (
                <div className="space-y-2">
                  {Object.entries(customAttributes).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">
                        <strong>{key}:</strong> {value}
                      </span>
                      <X
                        className="w-4 h-4 cursor-pointer text-gray-500 hover:text-red-500"
                        onClick={() => removeAttribute(key)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button type="submit" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Smart Object
          </Button>
        </form>

        {/* Object Count */}
        {objects.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>{objects.length}</strong> object{objects.length !== 1 ? 's' : ''} defined for this task
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
} 