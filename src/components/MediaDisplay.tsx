import { useState, useEffect } from 'react';
import { MediaItem } from '@/lib/services/procedure.service';
import { Video, FileText, Music, AlertCircle, RefreshCw, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface MediaDisplayProps {
  item: MediaItem;
}

export default function MediaDisplay({ item }: MediaDisplayProps) {
  const [mediaUrl, setMediaUrl] = useState<string>(item.url || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefreshed, setAutoRefreshed] = useState<boolean>(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Debug log function
  const debugLog = (message: string, data?: any) => {
    console.log(`[MEDIA-DISPLAY] ${item.id}: ${message}`);
    if (data) {
      console.log(data);
    }
  };

  // Update URL when item changes
  useEffect(() => {
    debugLog(`Item URL changed or component mounted: ${item.url}`);
    if (item.url !== mediaUrl) {
      setMediaUrl(item.url || '');
      setError(null);
    }
  }, [item.url]);

  // Function to check if URL is valid
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  // Function to refresh URL if needed
  const refreshUrl = async () => {
    debugLog('Attempting to refresh URL');
    
    // If no filePath or URL is available, we can't refresh
    if (!item.filePath && !item.url) {
      setError('No file path available to refresh URL');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Extract file path from URL if not provided
      const filePath = item.filePath || item.url.split('/').pop();
      
      debugLog(`Refreshing URL with filePath: ${filePath}`);
      
      const response = await fetch('/api/storage/refresh-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh URL');
      }

      const data = await response.json();
      
      if (data.success && data.data.url) {
        debugLog(`URL refreshed successfully: ${data.data.url}`);
        setMediaUrl(data.data.url);
        setAutoRefreshed(true);
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

  // Auto-refresh URL on error
  const handleMediaError = () => {
    debugLog('Media failed to load');
    if (!autoRefreshed) {
      setError('Media failed to load. Attempting to refresh URL...');
      refreshUrl();
    } else {
      setError('Media failed to load even after refreshing the URL.');
    }
  };

  // Render different media types
  const renderMedia = () => {
    // Check if URL is valid
    if (!mediaUrl || !isValidUrl(mediaUrl)) {
      debugLog('No valid URL available');
      return (
        <div className="flex flex-col items-center justify-center h-40 bg-gray-100 rounded">
          <AlertCircle className="h-8 w-8 text-gray-400 mb-2" />
          <p className="text-gray-500">Media unavailable</p>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={refreshUrl} 
            disabled={isLoading}
            className="mt-2"
          >
            {isLoading ? 'Refreshing...' : 'Try to load'}
          </Button>
        </div>
      );
    }

    debugLog(`Rendering media of type: ${item.type}`);
    
    switch (item.type) {
      case 'IMAGE':
        return (
          <div className="relative rounded overflow-hidden bg-gray-100 flex items-center justify-center min-h-[150px]">
            {/* Use next/image with proper sizing */}
            <Image
              src={mediaUrl}
              alt={item.caption || 'Image'}
              width={400}
              height={300}
              className="w-full h-auto max-h-96 object-contain"
              onError={handleMediaError}
              onLoad={(e) => {
                const img = e.target as HTMLImageElement;
                setImageDimensions({
                  width: img.naturalWidth,
                  height: img.naturalHeight
                });
                debugLog(`Image loaded: ${img.naturalWidth}x${img.naturalHeight}`);
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
              onError={handleMediaError}
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
              onError={handleMediaError}
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
              <Button 
                onClick={() => window.open(mediaUrl, '_blank')}
                variant="outline"
              >
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
              disabled={isLoading}
              className="flex items-center"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh URL
                </>
              )}
            </Button>
          </div>
        </div>
      )}
      
      {item.caption && !error && (
        <p className="text-sm text-gray-600 italic">{item.caption}</p>
      )}
      
      {item.type === 'IMAGE' && imageDimensions.width > 0 && (
        <p className="text-xs text-gray-400">
          {imageDimensions.width} × {imageDimensions.height}
        </p>
      )}
    </div>
  );
} 