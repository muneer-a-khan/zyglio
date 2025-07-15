"use client";

import { useState, useEffect } from "react";
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
import { 
  Plus, 
  Edit, 
  Trash, 
  Package, 
  User, 
  MapPin, 
  FileText, 
  Settings,
  Image,
  Tag
} from "lucide-react";
import { toast } from "sonner";
import { SimulationObject } from "@/types/simulation";
import { simulationEngine } from "@/lib/simulation-engine";

export interface ObjectManagerProps {
  objects: SimulationObject[];
  onAddObject: (obj: SimulationObject) => void;
  onUpdateObject: (id: string, updatedObj: SimulationObject) => void;
  onDeleteObject: (id: string) => void;
  onSelectObjects: (objectIds: string[]) => void;
  selectedObjects: string[];
}

const OBJECT_TYPES = [
  { value: "equipment", label: "Equipment", icon: Package },
  { value: "material", label: "Material", icon: Package },
  { value: "environment", label: "Environment", icon: MapPin },
  { value: "person", label: "Person", icon: User },
  { value: "document", label: "Document", icon: FileText },
];

const ObjectManager: React.FC<ObjectManagerProps> = ({
  objects,
  onAddObject,
  onUpdateObject,
  onDeleteObject,
  onSelectObjects,
  selectedObjects
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingObject, setEditingObject] = useState<SimulationObject | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "Equipment" as SimulationObject['category'],
    description: "",
    properties: "",
    interactions: "",
    mediaUrl: "",
    tags: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      category: "Equipment",
      description: "",
      properties: "",
      interactions: "",
      mediaUrl: "",
      tags: "",
    });
    setIsCreating(false);
    setEditingObject(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let properties = {};
      let interactions: string[] = [];
      let tags: string[] = [];

      // Parse JSON properties
      if (formData.properties.trim()) {
        try {
          properties = JSON.parse(formData.properties);
        } catch (error) {
          toast.error("Invalid JSON format for properties");
          return;
        }
      }

      // Parse interactions
      if (formData.interactions.trim()) {
        interactions = formData.interactions.split(",").map(i => i.trim()).filter(Boolean);
      }

      // Parse tags
      if (formData.tags.trim()) {
        tags = formData.tags.split(",").map(t => t.trim()).filter(Boolean);
      }

      const objectData = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        attributes: properties,
        behaviors: interactions,
        signals: [], // Initialize empty signals array
        states: [], // Initialize empty states array
        mediaUrl: formData.mediaUrl || undefined,
        simulationTags: tags,
      };

      let updatedObjects: SimulationObject[];

      if (editingObject) {
        // Update existing object
        const updatedObject = await simulationEngine.updateObject(editingObject.id, objectData);
        if (updatedObject) {
          updatedObjects = objects.map(obj => 
            obj.id === editingObject.id ? updatedObject : obj
          );
          toast.success("Object updated successfully");
        } else {
          toast.error("Failed to update object");
          return;
        }
      } else {
        // Create new object
        const newObject = await simulationEngine.createObject(objectData);
        updatedObjects = [...objects, newObject];
        toast.success("Object created successfully");
      }

      onAddObject(updatedObjects[updatedObjects.length - 1]);
      resetForm();
    } catch (error) {
      console.error("Error saving object:", error);
      toast.error("Failed to save object");
    }
  };

  const handleEdit = (object: SimulationObject) => {
    setEditingObject(object);
    setFormData({
      name: object.name,
      category: object.category,
      description: object.description || "",
      properties: JSON.stringify(object.attributes, null, 2),
      interactions: object.behaviors.join(", "),
      mediaUrl: object.mediaUrl || "",
      tags: object.simulationTags?.join(", ") || "",
    });
    setIsCreating(true);
  };

  const handleDelete = async (objectId: string) => {
    if (!confirm("Are you sure you want to delete this object?")) return;

    try {
      const success = await simulationEngine.deleteObject(objectId);
      if (success) {
        const updatedObjects = objects.filter(obj => obj.id !== objectId);
        onDeleteObject(objectId);
        toast.success("Object deleted successfully");
      } else {
        toast.error("Failed to delete object");
      }
    } catch (error) {
      console.error("Error deleting object:", error);
      toast.error("Failed to delete object");
    }
  };

  const getObjectTypeIcon = (category: string) => {
    const objectType = OBJECT_TYPES.find(t => t.value.toLowerCase() === category.toLowerCase());
    return objectType ? objectType.icon : Package;
  };

  const getObjectTypeLabel = (category: string) => {
    const objectType = OBJECT_TYPES.find(t => t.value.toLowerCase() === category.toLowerCase());
    return objectType ? objectType.label : category;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Simulation Objects</h3>
        <Button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Object
        </Button>
      </div>

      {/* Object Creation/Edit Form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {editingObject ? "Edit Object" : "Create New Object"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Object Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter object name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Object Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value as SimulationObject['category'] })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select object category" />
                    </SelectTrigger>
                    <SelectContent>
                      {OBJECT_TYPES.map((type) => (
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
                  placeholder="Describe the object and its purpose"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="properties">Properties (JSON)</Label>
                <Textarea
                  id="properties"
                  value={formData.properties}
                  onChange={(e) => setFormData({ ...formData, properties: e.target.value })}
                  placeholder='{"color": "red", "weight": 5, "temperature": 20}'
                  rows={4}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Define object properties as JSON key-value pairs
                </p>
              </div>

              <div>
                <Label htmlFor="interactions">Available Interactions</Label>
                <Input
                  id="interactions"
                  value={formData.interactions}
                  onChange={(e) => setFormData({ ...formData, interactions: e.target.value })}
                  placeholder="click, drag, rotate, activate, measure"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Comma-separated list of possible interactions
                </p>
              </div>

              <div>
                <Label htmlFor="mediaUrl">Media URL (optional)</Label>
                <Input
                  id="mediaUrl"
                  value={formData.mediaUrl}
                  onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="laboratory, safety, critical, reusable"
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
                  {editingObject ? "Update Object" : "Create Object"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Objects List */}
      <div className="grid gap-4">
        {objects.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Objects Created</h3>
              <p>Start by creating simulation objects that learners can interact with.</p>
            </div>
          </Card>
        ) : (
          objects.map((object) => {
            const IconComponent = getObjectTypeIcon(object.category);
            return (
              <Card key={object.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <IconComponent className="w-5 h-5 text-blue-600" />
                        <h4 className="font-medium">{object.name}</h4>
                        <Badge variant="secondary">
                          {getObjectTypeLabel(object.category)}
                        </Badge>
                      </div>

                      {object.description && (
                        <p className="text-gray-600 mb-3">{object.description}</p>
                      )}

                      {object.behaviors.length > 0 && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-700 mb-1">
                            Available Interactions:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {object.behaviors.map((interaction, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {interaction}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {Object.keys(object.attributes).length > 0 && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-700 mb-1">
                            Properties:
                          </p>
                          <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                            {JSON.stringify(object.attributes, null, 2)}
                          </pre>
                        </div>
                      )}

                      {object.simulationTags && object.simulationTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {object.simulationTags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              <Tag className="w-3 h-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {object.mediaUrl && (
                        <div className="mb-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Image className="w-4 h-4" />
                            <span>Media attached</span>
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-gray-500">
                        Created: {object.createdAt ? new Date(object.createdAt).toLocaleDateString() : 'Unknown'}
                        {object.updatedAt && object.updatedAt !== object.createdAt && (
                          <span className="ml-2">
                            Updated: {new Date(object.updatedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(object)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(object.id)}
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

export default ObjectManager; 