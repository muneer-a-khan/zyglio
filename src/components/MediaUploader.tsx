import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Upload, Image, FileText, Video, File, X, Music, 
  Trash2, Plus, ExternalLink, Loader2, UploadCloud, Settings,
  Wifi, WifiOff 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MediaItem } from "@/lib/services";
import { v4 as uuidv4 } from 'uuid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import StorageSetup from "./StorageSetup";
import { useProcessingSSE } from "@/hooks/use-processing-sse";

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
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  // Get current task ID
  useEffect(() => {
    const getTaskId = async () => {
      try {
        const { ProcedureService } = await import('@/lib/services');
        const procedureService = new ProcedureService();
        const taskId = procedureService.getCurrentTaskId();
        setCurrentTaskId(taskId);
      } catch (error) {
        console.error('Error getting task ID:', error);
      }
    };
    getTaskId();
  }, []);

  // Use SSE for real-time processing updates
  const { 
    processingStatus, 
    isConnected, 
    connectionError, 
    reconnect 
  } = useProcessingSSE(currentTaskId);

  // Update local state when props change
  useEffect(() => {
    setItems(mediaItems);
  }, [mediaItems]);

  // Show processing feedback and handle completion notifications
  useEffect(() => {
    const statusEntries = Object.entries(processingStatus);
    const hasProcessing = statusEntries.some(([_, status]) => 
      ['pending', 'processing'].includes(status.status)
    );
    
    const completedItems = statusEntries.filter(([_, status]) => 
      status.status === 'completed'
    );
    
    const failedItems = statusEntries.filter(([_, status]) => 
      status.status === 'failed'
    );

    // Show success notifications for completed items
    completedItems.forEach(([mediaItemId, status]) => {
      const wasJustCompleted = status.lastUpdated && 
        new Date(status.lastUpdated).getTime() > Date.now() - 5000; // Within last 5 seconds
      
      if (wasJustCompleted) {
        toast.success(`Successfully processed ${status.filename}`, {
          description: status.summary ? `Summary: ${status.summary.substring(0, 100)}...` : undefined
        });
      }
    });

    // Show error notifications for failed items
    failedItems.forEach(([mediaItemId, status]) => {
      const wasJustFailed = status.lastUpdated && 
        new Date(status.lastUpdated).getTime() > Date.now() - 5000; // Within last 5 seconds
      
      if (wasJustFailed && status.errorMessage) {
        toast.error(`Failed to process ${status.filename}`, {
          description: status.errorMessage
        });
      }
    });
  }, [processingStatus]);

  const startMediaProcessing = async (mediaItemId: string) => {
    try {
      if (!currentTaskId) {
        console.error('No task ID available for media processing');
        return;
      }

      const response = await fetch('/api/media/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaItemId, taskId: currentTaskId })
      });

      if (response.ok) {
        toast.info('Started processing uploaded media...');
      } else {
        const errorData = await response.json();
        console.error('Failed to start media processing:', errorData);
        toast.error('Failed to start media processing');
      }
    } catch (error) {
      console.error('Error starting media processing:', error);
      toast.error('Error starting media processing');
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
            
            let errorMessage = `Failed to upload file ${file.name}`;
            if (responseData.message) {
              if (responseData.message.includes('row-level security policy')) {
                errorMessage = `Security policy error: You don't have permission to upload this file. Please check with the administrator.`;
              } else {
                errorMessage = responseData.message;
              }
            }
            
            toast.error(errorMessage);
            continue;
          }
          
          console.log('Upload success response:', responseData);
          
          if (responseData.success) {
            let type: string = "IMAGE";
            if (file.type.startsWith('image/')) type = "IMAGE";
            else if (file.type.startsWith('video/')) type = "VIDEO";
            else if (file.type.startsWith('audio/')) type = "AUDIO";
            else if (file.type.startsWith('application/pdf') || file.name.toLowerCase().endsWith('.pdf')) type = "PDF";
            else {
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
            await startMediaProcessing(newItem.id);
          }
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
          toast.error(`Failed to process ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
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
              <Image 
                src={item.url} 
                alt={item.caption || 'Image preview'} 
                width={96}
                height={96}
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
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending', icon: '⏳' },
      processing: { 
        color: 'bg-blue-100 text-blue-800', 
        text: `Processing... (${status.progress}%)`, 
        icon: '🔄'
      },
      completed: { color: 'bg-green-100 text-green-800', text: 'Processed', icon: '✅' },
      failed: { color: 'bg-red-100 text-red-800', text: 'Failed', icon: '❌' }
    };

    const config = statusConfig[status.status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <div className="mt-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
            <span className="mr-1">{config.icon}</span>
            {config.text}
          </span>
          {status.status === 'processing' && status.stage && (
            <span className="text-xs text-gray-500">{status.stage}</span>
          )}
        </div>
        
        {status.status === 'processing' && (
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
              style={{ width: `${status.progress}%` }}
            />
          </div>
        )}

        {status.status === 'completed' && status.summary && (
          <div className="mt-2 text-xs text-gray-600 bg-green-50 p-2 rounded">
            <p className="font-medium text-green-800">Summary:</p>
            <p className="text-gray-700">{status.summary}</p>
            {status.keyTopics && status.keyTopics.length > 0 && (
              <div className="mt-1">
                <span className="font-medium text-green-800">Key Topics:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {status.keyTopics.slice(0, 3).map((topic: string, index: number) => (
                    <span key={index} className="bg-green-200 text-green-800 px-2 py-1 rounded text-xs">
                      {topic}
                    </span>
                  ))}
                  {status.keyTopics.length > 3 && (
                    <span className="text-green-700 text-xs">+{status.keyTopics.length - 3} more</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {status.status === 'failed' && status.errorMessage && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
            <span className="font-medium">Error:</span> {status.errorMessage}
          </div>
        )}
      </div>
    );
  };

  // Show processing feedback when there are items being processed
  const showProcessingFeedback = Object.values(processingStatus).some(status => 
    ['pending', 'processing'].includes(status.status)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Media Resources</h2>
        <div className="flex items-center gap-2">
          {/* Connection Status Indicator */}
          <div className="flex items-center gap-1 text-xs">
            {isConnected ? (
              <><Wifi className="h-3 w-3 text-green-500" /><span className="text-green-600">Connected</span></>
            ) : (
              <><WifiOff className="h-3 w-3 text-red-500" /><span className="text-red-600">Disconnected</span></>
            )}
          </div>
          {connectionError && (
            <Button variant="outline" size="sm" onClick={reconnect}>
              Reconnect
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowStorageSetup(!showStorageSetup)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Storage Settings
          </Button>
        </div>
      </div>
      <p className="text-gray-500">
        Upload images, videos, or other media files to support your procedure.
      </p>
      
      {showStorageSetup && <StorageSetup />}
      
      {/* Real-time Media Processing Status */}
      {showProcessingFeedback && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="font-medium text-blue-900">Processing Media Content</span>
              <span className="text-xs text-blue-700">
                ({Object.values(processingStatus).filter(s => s.status === 'completed').length}/
                {Object.keys(processingStatus).length} completed)
              </span>
            </div>
            <p className="text-sm text-blue-800">
              Your uploaded media is being analyzed in real-time to extract relevant content for the interview. 
              Enhanced context will be automatically applied to improve interview questions.
            </p>
            
            {Object.keys(processingStatus).length > 0 && (
              <div className="mt-3 space-y-2">
                {Object.entries(processingStatus).map(([itemId, status]: [string, any]) => (
                  <div key={itemId} className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm truncate">{status.filename}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        status.status === 'completed' ? 'bg-green-100 text-green-800' :
                        status.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        status.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {status.status === 'processing' ? `${status.progress}%` : status.status}
                      </span>
                    </div>
                    
                    {status.status === 'processing' && (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-600">{status.stage}</div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                            style={{ width: `${status.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
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
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              isDragging 
                ? "border-blue-500 bg-blue-50" 
                : "border-gray-300 hover:border-gray-400"
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleFileDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            
            {isUploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                <p className="text-lg font-medium text-blue-700">Uploading files...</p>
                <p className="text-sm text-blue-500">Please wait while we process your files</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <UploadCloud className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  {isDragging ? "Drop files here" : "Drag & drop files or click to browse"}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Supports images, videos, audio files, and PDFs
                </p>
                <Button onClick={openFileDialog} variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Files
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="url" className="mt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url-input">Media URL</Label>
              <Input
                id="url-input"
                type="url"
                placeholder="https://example.com/media.jpg"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="url-caption">Caption (optional)</Label>
              <Input
                id="url-caption"
                type="text"
                placeholder="Describe this media..."
                value={urlCaption}
                onChange={(e) => setUrlCaption(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="url-type">Media Type</Label>
              <select
                id="url-type"
                value={urlType}
                onChange={(e) => setUrlType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="IMAGE">Image</option>
                <option value="VIDEO">Video</option>
                <option value="AUDIO">Audio</option>
                <option value="PDF">PDF Document</option>
              </select>
            </div>
            
            <Button onClick={handleAddUrlItem} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Media by URL
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      
      {items.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Uploaded Media ({items.length})</h3>
          <div className="grid gap-4">
            {items.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-start space-x-4">
                  {getMediaPreview(item)}
                  
                  <div className="flex-1 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor={`caption-${item.id}`}>Caption</Label>
                      <Input
                        id={`caption-${item.id}`}
                        value={item.caption || ''}
                        onChange={(e) => handleItemChange(item.id, 'caption', e.target.value)}
                        placeholder="Describe this media..."
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">Type: {item.type}</span>
                      {item.url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(item.url, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      )}
                    </div>
                    
                    {/* Processing Status Badge */}
                    {getProcessingStatusBadge(item.id)}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveItem(item.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaUploader;
