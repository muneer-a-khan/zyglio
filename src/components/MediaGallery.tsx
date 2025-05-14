import { useState } from 'react';
import { MediaItem } from '@/lib/ProcedureService';
import MediaDisplay from '@/components/MediaDisplay';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Grid2X2, List, Pencil, Trash } from 'lucide-react';

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
  
  if (mediaItems.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg border border-dashed">
        <p className="text-gray-500">No media items available</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">{title}</h3>
        <div className="flex space-x-2">
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
          {mediaItems.map(item => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-4">
                <MediaDisplay item={item} />
                
                {(onEdit || onDelete) && (
                  <div className="flex justify-end space-x-2 mt-2">
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
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {mediaItems.map(item => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="w-full md:w-2/5 lg:w-1/3">
                    <MediaDisplay item={item} />
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="text-lg font-medium mb-2">{item.caption || 'Untitled Media'}</h4>
                    <p className="text-sm text-gray-500 mb-4">Type: {item.type}</p>
                    
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