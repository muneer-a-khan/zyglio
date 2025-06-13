"use client";

import React, { useState } from 'react';
import { Search, Edit, Trash2, Settings, Eye, Zap } from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Checkbox } from '@/components/ui/checkbox';

// Types
import { SmartObject, ObjectLibraryProps } from '@/types/unified';

// Category icons mapping
const categoryIcons = {
  'Ingredient': '🧪',
  'Tool': '🔧',
  'Equipment': '⚙️',
  'Person': '👤',
  'Location': '📍'
};

// Category colors
const categoryColors = {
  'Ingredient': 'bg-green-100 text-green-800 border-green-200',
  'Tool': 'bg-blue-100 text-blue-800 border-blue-200',
  'Equipment': 'bg-purple-100 text-purple-800 border-purple-200',
  'Person': 'bg-orange-100 text-orange-800 border-orange-200',
  'Location': 'bg-red-100 text-red-800 border-red-200'
};

export function ObjectLibrary({ 
  objects, 
  onUpdateObject, 
  onDeleteObject,
  onSelectObject,
  selectedObjects = []
}: ObjectLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [expandedObject, setExpandedObject] = useState<string | null>(null);

  // Filter objects based on search and category
  const filteredObjects = objects.filter(obj => {
    const matchesSearch = obj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         obj.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || obj.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories from objects
  const availableCategories = Array.from(new Set(objects.map(obj => obj.category)));

  const toggleObjectSelection = (objectId: string) => {
    if (onSelectObject) {
      onSelectObject(objectId);
    }
  };

  const toggleObjectExpansion = (objectId: string) => {
    setExpandedObject(expandedObject === objectId ? null : objectId);
  };

  const handleStateChange = (objectId: string, newState: string) => {
    onUpdateObject(objectId, { currentState: newState });
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Object Library
          </h2>
          <div className="text-sm text-gray-600">
            {objects.length} object{objects.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Search and Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search objects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {availableCategories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={selectedCategory === '' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedCategory('')}
              >
                All
              </Badge>
              {availableCategories.map(category => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  className={`cursor-pointer ${categoryColors[category as keyof typeof categoryColors]}`}
                  onClick={() => setSelectedCategory(selectedCategory === category ? '' : category)}
                >
                  {categoryIcons[category as keyof typeof categoryIcons]} {category}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Object List */}
      <ScrollArea className="flex-1 p-6">
        {filteredObjects.length === 0 ? (
          <div className="text-center py-12">
            <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {objects.length === 0 ? 'No objects defined yet' : 'No objects found'}
            </h3>
            <p className="text-gray-600">
              {objects.length === 0 
                ? 'Create your first smart object to get started with scenario building.'
                : 'Try adjusting your search or filter criteria.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredObjects.map((object) => (
              <Card 
                key={object.id} 
                className={`transition-all duration-200 hover:shadow-md ${
                  selectedObjects.includes(object.id) ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {onSelectObject && (
                        <Checkbox
                          checked={selectedObjects.includes(object.id)}
                          onCheckedChange={() => toggleObjectSelection(object.id)}
                        />
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {categoryIcons[object.category as keyof typeof categoryIcons]}
                        </span>
                        <CardTitle className="text-base">{object.name}</CardTitle>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={categoryColors[object.category as keyof typeof categoryColors]}
                      >
                        {object.category}
                      </Badge>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleObjectExpansion(object.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {/* TODO: Implement edit functionality */}}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Object</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{object.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => onDeleteObject(object.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>

                {expandedObject === object.id && (
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {/* Current State */}
                      {object.states.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Current State</h4>
                          <div className="flex flex-wrap gap-2">
                            {object.states.map((state) => (
                              <Badge
                                key={state}
                                variant={object.currentState === state ? 'default' : 'outline'}
                                className={`cursor-pointer ${
                                  object.currentState === state ? 'bg-green-600' : 'hover:bg-gray-100'
                                }`}
                                onClick={() => handleStateChange(object.id, state)}
                              >
                                {state}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Behaviors */}
                      {object.behaviors.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Behaviors</h4>
                          <div className="flex flex-wrap gap-2">
                            {object.behaviors.map((behavior) => (
                              <Badge key={behavior} variant="outline">
                                {behavior}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Signals */}
                      {object.signals.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Signals</h4>
                          <div className="flex flex-wrap gap-2">
                            {object.signals.map((signal) => (
                              <Badge key={signal} variant="destructive" className="flex items-center gap-1">
                                <Zap className="w-3 h-3" />
                                {signal}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Custom Attributes */}
                      {Object.keys(object.attributes).length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Attributes</h4>
                          <div className="space-y-1">
                            {Object.entries(object.attributes).map(([key, value]) => (
                              <div key={key} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                                <span className="font-medium">{key}:</span>
                                <span>{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="pt-2 border-t border-gray-100">
                        <div className="text-xs text-gray-500 space-y-1">
                          <div>ID: {object.id}</div>
                          {object.createdAt && (
                            <div>Created: {new Date(object.createdAt).toLocaleString()}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Summary Footer */}
      {objects.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>
              {filteredObjects.length} of {objects.length} objects shown
            </span>
            {selectedObjects.length > 0 && (
              <span className="font-medium">
                {selectedObjects.length} selected
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 