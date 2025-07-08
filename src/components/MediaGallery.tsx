import { useState } from 'react';
import { MediaItem } from '@/lib/services/procedure.service';
import MediaDisplay from '@/components/MediaDisplay';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Grid2X2, List, Pencil, Trash, Calendar, User, RefreshCw, Copy, Check, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

interface MediaGalleryProps {
  mediaItems: MediaItem[];
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  title?: string;
}

export default function MediaGallery({ 
  mediaItems,
  onDelete,
  onEdit,
  title = 'Media Gallery'
}: MediaGalleryProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [items, setItems] = useState<MediaItem[]>(mediaItems);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Update items when mediaItems prop changes
  if (JSON.stringify(items) !== JSON.stringify(mediaItems)) {
    setItems(mediaItems);
  }
  
  if (items.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg border border-dashed">
        <p className="text-gray-500">No media items available</p>
      </div>
    );
  }
  
  // Format the date for display
  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return 'Invalid date';
    }
  };
  
  // Function to refresh all URLs
  const refreshAllUrls = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    toast.info('Refreshing media URLs...');
    
    try {
      const response = await fetch('/api/media/refresh-all', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh media URLs');
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.mediaItems)) {
        setItems(data.mediaItems);
        toast.success('Media URLs refreshed successfully');
      } else {
        throw new Error(data.message || 'Failed to refresh media URLs');
      }
    } catch (error) {
      console.error('Error refreshing media URLs:', error);
      toast.error('Failed to refresh media URLs');
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Function to copy URL to clipboard
  const copyToClipboard = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast.success('URL copied to clipboard');
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (err) {
      toast.error('Failed to copy URL');
      console.error('Failed to copy URL:', err);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">{title}</h3>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAllUrls}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh All'}
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid2X2 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <Card key={item.id} className="overflow-hidden flex flex-col">
              <CardContent className="p-4 flex-grow">
                <MediaDisplay item={item} />
                
                <div className="mt-2">
                  <h4 className="text-md font-medium line-clamp-1">
                    {item.caption || 'Untitled Media'}
                  </h4>
                  
                  <div className="flex flex-wrap items-center text-sm text-gray-500 mt-1 gap-x-4">
                    {item.createdAt && (
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    )}
                    
                    {item.presenter && (
                      <div className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        <span>{item.presenter}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Add URL with copy button */}
                  <div className="mt-2 flex items-center space-x-2 border-t pt-2">
                    <Input 
                      value={item.url} 
                      readOnly 
                      className="font-mono text-xs text-ellipsis"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(item.url, item.id)}
                      className="flex-shrink-0"
                      title="Copy URL"
                    >
                      {copiedId === item.id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(item.url, '_blank')}
                      className="flex-shrink-0"
                      title="Open in new tab"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
              
              {(onEdit || onDelete) && (
                <CardFooter className="p-3 pt-0 border-t">
                  <div className="flex justify-end space-x-2 w-full">
                    {onEdit && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onEdit(item.id)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                    {onDelete && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onDelete(item.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="w-full md:w-2/5 lg:w-1/3">
                    <MediaDisplay item={item} />
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="text-lg font-medium mb-2">{item.caption || 'Untitled Media'}</h4>
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-gray-500">Type: {item.type}</p>
                      
                      <div className="flex flex-wrap items-center text-sm text-gray-500 gap-x-4">
                        {item.createdAt && (
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>{formatDate(item.createdAt)}</span>
                          </div>
                        )}
                        
                        {item.presenter && (
                          <div className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            <span>{item.presenter}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Add URL with copy button */}
                      <div className="mt-3 flex items-center space-x-2">
                        <Input 
                          value={item.url} 
                          readOnly 
                          className="font-mono text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(item.url, item.id)}
                          className="flex-shrink-0"
                          title="Copy URL"
                        >
                          {copiedId === item.id ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(item.url, '_blank')}
                          className="flex-shrink-0"
                          title="Open in new tab"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {(onEdit || onDelete) && (
                      <div className="flex space-x-2">
                        {onEdit && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => onEdit(item.id)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        )}
                        {onDelete && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => onDelete(item.id)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 