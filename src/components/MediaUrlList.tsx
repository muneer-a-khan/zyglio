import { useState } from 'react';
import { MediaItem } from '@/lib/ProcedureService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface MediaUrlListProps {
  mediaItems: MediaItem[];
}

export default function MediaUrlList({ mediaItems }: MediaUrlListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
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
  
  if (mediaItems.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg border border-dashed">
        <p className="text-gray-500">No media items available</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium mb-4">Media URLs (10-year expiry)</h3>
      
      <div className="space-y-3">
        {mediaItems.map(item => (
          <div key={item.id} className="flex flex-col space-y-2 p-3 border rounded-md">
            <div className="flex items-center justify-between">
              <span className="font-medium">{item.caption || 'Untitled Media'}</span>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">{item.type}</span>
            </div>
            
            <div className="flex items-center space-x-2">
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
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 