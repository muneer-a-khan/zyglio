import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Upload, Image, FileText, Video, File, X, Music, 
  Trash2, Plus, ExternalLink, Loader2, UploadCloud, Settings 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MediaItem } from "@/lib/ProcedureService";
import { v4 as uuidv4 } from 'uuid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import StorageSetup from "./StorageSetup";

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
  const [showStorageSetup, setShowStorageSetup] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<Record<string, any>>({});
  const [showProcessingFeedback, setShowProcessingFeedback] = useState(false);

  // Update local state when props change
  useEffect(() => {
    setItems(mediaItems);
  }, [mediaItems]);

  // Start polling for processing status when media items are uploaded
  useEffect(() => {
    if (items.length > 0) {
      checkProcessingStatus();
      const interval = setInterval(checkProcessingStatus, 3000); // Poll every 3 seconds
      return () => clearInterval(interval);
    }
  }, [items]);

  const checkProcessingStatus = async () => {
    if (items.length === 0) return;

    try {
      // Get the current task ID from ProcedureService
      const { procedureService } = await import('@/lib/ProcedureService');
      const taskId = procedureService.currentTaskId;
      
      if (!taskId) return;

      const response = await fetch(`/api/media/process?taskId=${taskId}`);
      if (!response.ok) return;

      const data = await response.json();
      if (data.success) {
        const statusMap: Record<string, any> = {};
        data.processingStatus.forEach((status: any) => {
          statusMap[status.mediaItemId] = status;
        });
        
        setProcessingStatus(statusMap);
        
        // Show processing feedback if any items are being processed
        const hasProcessing = data.processingStatus.some((status: any) => 
          ['pending', 'processing'].includes(status.status)
        );
        setShowProcessingFeedback(hasProcessing);
        
        // Show success message when all processing completes
        if (data.summary.allCompleted && data.summary.completed > 0) {
          toast.success(`Media processing completed! ${data.summary.completed} files processed successfully.`);
        }
        
        // Show error messages for failed items
        data.processingStatus.forEach((status: any) => {
          if (status.status === 'failed' && status.errorMessage) {
            toast.error(`Failed to process ${status.filename}: ${status.errorMessage}`);
          }
        });
      }
    } catch (error) {
      console.error('Error checking processing status:', error);
    }
  };

  const startMediaProcessing = async (mediaItemId: string) => {
    try {
      const { procedureService } = await import('@/lib/ProcedureService');
      const taskId = procedureService.currentTaskId;
      
      if (!taskId) {
        console.error('No task ID available for media processing');
        return;
      }

      const response = await fetch('/api/media/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaItemId, taskId })
      });

      if (response.ok) {
        toast.info('Started processing uploaded media...');
        setShowProcessingFeedback(true);
      } else {
        const errorData = await response.json();
        console.error('Failed to start media processing:', errorData);
      }
    } catch (error) {
      console.error('Error starting media processing:', error);
    }
  };

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
    
    // Start processing for URL-based media
    startMediaProcessing(newItem.id);
    
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
        
        console.log(`Uploading file: ${file.name}, type: ${file.type}, size: ${file.size}`);
        
        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          
          const responseData = await response.json();
          
          if (!response.ok) {
            console.error('Upload error response:', responseData);
            
            // Show a more specific error message
            let errorMessage = `Failed to upload file ${file.name}`;
            if (responseData.message) {
              if (responseData.message.includes('row-level security policy')) {
                errorMessage = `Security policy error: You don't have permission to upload this file. Please check with the administrator.`;
              } else {
                errorMessage = responseData.message;
              }
            }
            
            toast.error(errorMessage);
            continue; // Skip this file but continue with others
          }
          
          console.log('Upload success response:', responseData);
          
          if (responseData.success) {
            // Determine file type from mime type or extension
            let type: string = "IMAGE";
            if (file.type.startsWith('image/')) type = "IMAGE";
            else if (file.type.startsWith('video/')) type = "VIDEO";
            else if (file.type.startsWith('audio/')) type = "AUDIO";
            else if (file.type.startsWith('application/pdf') || file.name.toLowerCase().endsWith('.pdf')) type = "PDF";
            else {
              // Fallback to extension check if MIME type is not standard
              const extension = file.name.split('.').pop()?.toLowerCase();
              if (extension) {
                if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) type = "IMAGE";
                else if (['mp4', 'webm', 'mov', 'avi'].includes(extension)) type = "VIDEO";
                else if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) type = "AUDIO";
                else if (extension === 'pdf') type = "PDF";
              }
            }
            
            const newItem = {
              id: uuidv4(),
              type,
              url: responseData.data.url,
              caption: file.name,
              filePath: responseData.data.filePath
            };
            
            newItems.push(newItem);
            
            // Start background processing for this media item
            await startMediaProcessing(newItem.id);
          }
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
          toast.error(`Failed to process ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
          // Continue with other files
        }
      }
      
      if (newItems.length > 0) {
        const updatedItems = [...items, ...newItems];
        setItems(updatedItems);
        onChange(updatedItems);
        toast.success(`Successfully uploaded ${newItems.length} file(s)`);
      } else {
        toast.error("No files were uploaded successfully.");
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

  const getProcessingStatusBadge = (itemId: string) => {
    const status = processingStatus[itemId];
    if (!status) return null;

    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      processing: { color: 'bg-blue-100 text-blue-800', text: 'Processing...' },
      completed: { color: 'bg-green-100 text-green-800', text: 'Processed' },
      failed: { color: 'bg-red-100 text-red-800', text: 'Failed' }
    };

    const config = statusConfig[status.status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <div className="mt-2">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
          {config.text}
        </span>
        {status.status === 'completed' && status.summary && (
          <div className="mt-1 text-xs text-gray-600">
            <p className="font-medium">Summary:</p>
            <p>{status.summary}</p>
            {status.keyTopics && status.keyTopics.length > 0 && (
              <p className="mt-1">
                <span className="font-medium">Topics:</span> {status.keyTopics.slice(0, 3).join(', ')}
                {status.keyTopics.length > 3 && ` + ${status.keyTopics.length - 3} more`}
              </p>
            )}
          </div>
        )}
        {status.status === 'failed' && status.errorMessage && (
          <div className="mt-1 text-xs text-red-600">
            Error: {status.errorMessage}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Media Resources</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowStorageSetup(!showStorageSetup)}
        >
          <Settings className="h-4 w-4 mr-2" />
          Storage Settings
        </Button>
      </div>
      <p className="text-gray-500">
        Upload images, videos, or other media files to support your procedure.
      </p>
      
      {showStorageSetup && <StorageSetup />}
      
      {/* Media Processing Status */}
      {showProcessingFeedback && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="font-medium text-blue-900">Processing Media Content</span>
            </div>
            <p className="text-sm text-blue-800">
              Your uploaded media is being analyzed to extract relevant content for the interview. 
              This process runs in the background and will enhance your interview questions with knowledge from your files.
            </p>
            {Object.keys(processingStatus).length > 0 && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(processingStatus).map(([itemId, status]: [string, any]) => (
                  <div key={itemId} className="flex items-center justify-between bg-white rounded p-2 text-sm">
                    <span className="truncate">{status.filename}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      status.status === 'completed' ? 'bg-green-100 text-green-800' :
                      status.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      status.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {status.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
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
                  
                  {/* Processing Status */}
                  {getProcessingStatusBadge(item.id)}
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
