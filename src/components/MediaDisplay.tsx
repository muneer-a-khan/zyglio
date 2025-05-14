import { useState, useEffect } from 'react';
import { MediaItem } from '@/lib/ProcedureService';
import { Image, Video, FileText, Music, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MediaDisplayProps {
  item: MediaItem;
}

export default function MediaDisplay({ item }: MediaDisplayProps) {
  const [mediaUrl, setMediaUrl] = useState<string>(item.url);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Function to refresh URL if needed
  const refreshUrl = async () => {
    if (!item.filePath) {
      setError('No file path available to refresh URL');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/storage/refresh-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath: item.filePath }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh URL');
      }

      const data = await response.json();
      
      if (data.success && data.data.url) {
        setMediaUrl(data.data.url);
      } else {
        throw new Error(data.message || 'Failed to get new URL');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error refreshing URL');
      console.error('Error refreshing URL:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Render different media types
  const renderMedia = () => {
    switch (item.type) {
      case 'IMAGE':
        return (
          <div className="relative rounded overflow-hidden bg-gray-100">
            <img
              src={mediaUrl}
              alt={item.caption || 'Image'}
              className="w-full h-auto max-h-96 object-contain"
              onError={(e) => {
                // If image fails to load, we might need to refresh the URL
                setError('Image failed to load. The URL may have expired.');
              }}
            />
          </div>
        );
      
      case 'VIDEO':
        return (
          <div className="relative rounded overflow-hidden bg-gray-100">
            <video
              src={mediaUrl}
              controls
              className="w-full h-auto max-h-96"
              onError={() => {
                setError('Video failed to load. The URL may have expired.');
              }}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        );
      
      case 'AUDIO':
        return (
          <div className="flex items-center p-4 bg-gray-100 rounded">
            <Music className="h-10 w-10 text-green-500 mr-4" />
            <audio
              src={mediaUrl}
              controls
              className="w-full"
              onError={() => {
                setError('Audio failed to load. The URL may have expired.');
              }}
            >
              Your browser does not support the audio tag.
            </audio>
          </div>
        );
      
      case 'PDF':
        return (
          <div className="flex flex-col p-4 bg-gray-100 rounded">
            <div className="flex items-center mb-4">
              <FileText className="h-10 w-10 text-orange-500 mr-4" />
              <span>{item.caption || 'PDF Document'}</span>
            </div>
            <div className="flex justify-between">
              <Button onClick={() => window.open(mediaUrl, '_blank')}>
                View PDF
              </Button>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="flex items-center p-4 bg-gray-100 rounded">
            <FileText className="h-10 w-10 text-gray-500 mr-4" />
            <span>{item.caption || 'File'}</span>
          </div>
        );
    }
  };

  return (
    <div className="media-display space-y-2">
      {renderMedia()}
      
      {error && (
        <div className="bg-red-50 p-3 rounded flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-red-700 text-sm">{error}</p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={refreshUrl} 
              disabled={isLoading || !item.filePath}
            >
              {isLoading ? 'Refreshing...' : 'Refresh URL'}
            </Button>
          </div>
        </div>
      )}
      
      {item.caption && (
        <p className="text-sm text-gray-600 italic">{item.caption}</p>
      )}
    </div>
  );
} 