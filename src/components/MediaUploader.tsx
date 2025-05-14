import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Upload, Image, FileText, Video, File, X, Music, 
  Trash2, Plus, ExternalLink, Loader2, UploadCloud 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MediaItem } from "@/lib/ProcedureService";
import { v4 as uuidv4 } from 'uuid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface MediaUploaderProps {
  mediaItems?: MediaItem[];
  onChange: (items: MediaItem[]) => void;
}

const MediaUploader = ({ mediaItems = [], onChange }: MediaUploaderProps) => {
  const [items, setItems] = useState<MediaItem[]>(mediaItems);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [urlInput, setUrlInput] = useState<string>("");
  const [urlCaption, setUrlCaption] = useState<string>("");
  const [urlType, setUrlType] = useState<string>("IMAGE");

  // Update local state when props change
  useEffect(() => {
    setItems(mediaItems);
  }, [mediaItems]);

  const handleAddUrlItem = () => {
    if (!urlInput) {
      toast.error("Please enter a valid URL");
      return;
    }

    const newItem: MediaItem = {
      id: uuidv4(),
      type: urlType,
      url: urlInput,
      caption: urlCaption
    };
    
    const newItems = [...items, newItem];
    setItems(newItems);
    onChange(newItems);
    
    // Reset form
    setUrlInput("");
    setUrlCaption("");
    setUrlType("IMAGE");
    toast.success("Media added successfully");
  };

  const handleRemoveItem = (id: string) => {
    const newItems = items.filter(item => item.id !== id);
    setItems(newItems);
    onChange(newItems);
    toast.success("Media removed");
  };

  const handleItemChange = (id: string, field: keyof MediaItem, value: string) => {
    const newItems = items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    
    setItems(newItems);
    onChange(newItems);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadFiles(e.target.files);
    }
  };

  const uploadFiles = async (files: FileList) => {
    setIsUploading(true);
    
    try {
      const newItems: MediaItem[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to upload file');
        }
        
        const result = await response.json();
        
        if (result.success) {
          let type: string = "IMAGE";
          if (file.type.startsWith('image/')) type = "IMAGE";
          else if (file.type.startsWith('video/')) type = "VIDEO";
          else if (file.type.startsWith('audio/')) type = "AUDIO";
          else type = "PDF";
          
          newItems.push({
            id: uuidv4(),
            type,
            url: result.data.url,
            caption: file.name,
          });
        }
      }
      
      const updatedItems = [...items, ...newItems];
      setItems(updatedItems);
      onChange(updatedItems);
      
      if (newItems.length > 0) {
        toast.success(`Successfully uploaded ${newItems.length} file(s)`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const getMediaPreview = (item: MediaItem) => {
    switch (item.type) {
      case 'IMAGE':
        return (
          <div className="relative h-24 w-24 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
            {item.url ? (
              <img 
                src={item.url} 
                alt={item.caption || 'Image preview'} 
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=Invalid';
                }}
              />
            ) : (
              <Image className="h-10 w-10 text-gray-400" />
            )}
          </div>
        );
      case 'VIDEO':
        return (
          <div className="relative h-24 w-24 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
            <Video className="h-10 w-10 text-red-500" />
          </div>
        );
      case 'AUDIO':
        return (
          <div className="relative h-24 w-24 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
            <Music className="h-10 w-10 text-green-500" />
          </div>
        );
      case 'PDF':
        return (
          <div className="relative h-24 w-24 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
            <FileText className="h-10 w-10 text-orange-500" />
          </div>
        );
      default:
        return (
          <div className="relative h-24 w-24 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
            <File className="h-10 w-10 text-gray-500" />
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Media Resources</h2>
      <p className="text-gray-500">
        Upload images, videos, or other media files to support your procedure.
      </p>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload Files</TabsTrigger>
          <TabsTrigger value="url">Add by URL</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload" className="mt-4">
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 transition-colors text-center cursor-pointer",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-gray-300 hover:border-primary hover:bg-primary/5"
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleFileDrop}
            onClick={openFileDialog}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={handleFileChange}
              accept="image/*,video/*,audio/*,application/pdf"
            />
            
            {isUploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="mt-2 text-sm text-gray-500">Uploading files...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <UploadCloud className="h-10 w-10 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">
                  Drag and drop files here, or click to browse
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Supports images, videos, audio files, and PDFs
                </p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="url" className="mt-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <Label htmlFor="media-url" className="mb-1 block">
                  URL
                </Label>
                <Input
                  id="media-url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  type="url"
                />
              </div>
              
              <div>
                <Label htmlFor="media-type" className="mb-1 block">
                  Type
                </Label>
                <select 
                  id="media-type"
                  value={urlType}
                  onChange={(e) => setUrlType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="IMAGE">Image</option>
                  <option value="VIDEO">Video</option>
                  <option value="AUDIO">Audio</option>
                  <option value="PDF">PDF</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="media-caption" className="mb-1 block">
                  Caption
                </Label>
                <Input
                  id="media-caption"
                  value={urlCaption}
                  onChange={(e) => setUrlCaption(e.target.value)}
                  placeholder="Describe this media resource"
                />
              </div>
              
              <Button 
                type="button" 
                onClick={handleAddUrlItem}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Media
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {items.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-3">Uploaded Media</h3>
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    {getMediaPreview(item)}
                    
                    <div className="flex-1 space-y-3">
                      <div>
                        <Label htmlFor={`item-url-${item.id}`} className="mb-1 block">
                          URL
                        </Label>
                        <div className="flex space-x-2">
                          <Input
                            id={`item-url-${item.id}`}
                            value={item.url}
                            onChange={(e) => handleItemChange(item.id, "url", e.target.value)}
                            placeholder="https://example.com/image.jpg"
                            readOnly
                            className="flex-1"
                          />
                          <Button 
                            variant="outline" 
                            size="icon"
                            type="button"
                            onClick={() => window.open(item.url, '_blank')}
                            title="Open in new tab"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-3">
                        <div>
                          <Label htmlFor={`item-caption-${item.id}`} className="mb-1 block">
                            Caption
                          </Label>
                          <Input
                            id={`item-caption-${item.id}`}
                            value={item.caption || ""}
                            onChange={(e) => handleItemChange(item.id, "caption", e.target.value)}
                            placeholder="Describe this media resource"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`item-type-${item.id}`} className="mb-1 block">
                            Type
                          </Label>
                          <select 
                            id={`item-type-${item.id}`}
                            value={item.type}
                            onChange={(e) => handleItemChange(item.id, "type", e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="IMAGE">Image</option>
                            <option value="VIDEO">Video</option>
                            <option value="AUDIO">Audio</option>
                            <option value="PDF">PDF</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="icon"
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="h-10 w-10 flex-shrink-0 self-start mt-6 md:mt-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaUploader;
