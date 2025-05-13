import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Image, FileText, Video, File, X, Music, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MediaItem } from "@/lib/ProcedureService";
import { v4 as uuidv4 } from 'uuid';

interface MediaUploaderProps {
  mediaItems?: MediaItem[];
  onChange: (items: MediaItem[]) => void;
}

const MediaUploader = ({ mediaItems = [], onChange }: MediaUploaderProps) => {
  const [items, setItems] = useState<MediaItem[]>(mediaItems);
  const [isDragging, setIsDragging] = useState(false);

  // Update local state when props change
  useEffect(() => {
    setItems(mediaItems);
  }, [mediaItems]);

  const handleAddItem = () => {
    const newItem: MediaItem = {
      id: uuidv4(),
      type: "IMAGE",
      url: "",
      caption: ""
    };
    
    const newItems = [...items, newItem];
    setItems(newItems);
    onChange(newItems);
  };

  const handleRemoveItem = (id: string) => {
    const newItems = items.filter(item => item.id !== id);
    setItems(newItems);
    onChange(newItems);
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

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleFiles = (files: FileList) => {
    const newMediaFiles: MediaItem[] = [];

    Array.from(files).forEach((file) => {
      const id = `file-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;
      newMediaFiles.push({
        id,
        name: file.name,
        type: file.type,
        url: URL.createObjectURL(file),
        size: formatFileSize(file.size),
      });
    });

    const newItems = [...items, ...newMediaFiles];
    setItems(newItems);
    onChange(newItems);
  };

  const removeFile = (id: string) => {
    setItems((prev) => {
      const fileToRemove = prev.find((file) => file.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.url);
      }
      return prev.filter((file) => file.id !== id);
    });
    onChange(items.filter((item) => item.id !== id));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/"))
      return <Image className="h-6 w-6 text-blue-500" />;
    if (type.startsWith("video/"))
      return <Video className="h-6 w-6 text-red-500" />;
    if (type.startsWith("audio/"))
      return <Music className="h-6 w-6 text-green-500" />;
    if (type.includes("pdf"))
      return <FileText className="h-6 w-6 text-orange-500" />;
    return <File className="h-6 w-6 text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Media Resources</h2>
      <p className="text-gray-500">
        Upload images, videos, or other media files to support your procedure.
      </p>
      
      <div className="space-y-4">
        {items.map((item, index) => (
          <Card key={item.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr,auto] gap-4 items-center">
                <div>
                  <Label htmlFor={`media-url-${index}`} className="mb-1 block">
                    URL
                  </Label>
                  <Input
                    id={`media-url-${index}`}
                    value={item.url}
                    onChange={(e) => handleItemChange(item.id, "url", e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    type="url"
                  />
                </div>
                
                <div>
                  <Label htmlFor={`media-type-${index}`} className="mb-1 block">
                    Type
                  </Label>
                  <select 
                    id={`media-type-${index}`}
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
                
                <Button 
                  variant="outline" 
                  size="icon"
                  type="button"
                  onClick={() => handleRemoveItem(item.id)}
                  className="mt-7"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="mt-4">
                <Label htmlFor={`media-caption-${index}`} className="mb-1 block">
                  Caption
                </Label>
                <Input
                  id={`media-caption-${index}`}
                  value={item.caption || ""}
                  onChange={(e) => handleItemChange(item.id, "caption", e.target.value)}
                  placeholder="Describe this media resource"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Button
        type="button"
        variant="outline"
        onClick={handleAddItem}
        className="w-full mt-4"
      >
        <Upload className="mr-2 h-4 w-4" />
        Add Media Resource
      </Button>
    </div>
  );
};

export default MediaUploader;
