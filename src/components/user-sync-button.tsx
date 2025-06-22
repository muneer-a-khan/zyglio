'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function UserSyncButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSync = async () => {
    try {
      setIsLoading(true);
      setStatus('idle');

      const response = await fetch('/api/auth/sync-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
        toast.success('User synchronized successfully!');
        console.log('User synced:', data.user);
        
        // Reload the page after successful sync
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setStatus('error');
        toast.error(data.message || 'Failed to sync user');
        console.error('Sync error:', data);
      }
    } catch (error) {
      setStatus('error');
      toast.error('Failed to sync user');
      console.error('Sync error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = () => {
    if (isLoading) return <RefreshCw className="mr-2 h-4 w-4 animate-spin" />;
    if (status === 'success') return <CheckCircle className="mr-2 h-4 w-4 text-green-600" />;
    if (status === 'error') return <AlertCircle className="mr-2 h-4 w-4 text-red-600" />;
    return <RefreshCw className="mr-2 h-4 w-4" />;
  };

  const getVariant = () => {
    if (status === 'success') return 'default' as const;
    if (status === 'error') return 'destructive' as const;
    return 'outline' as const;
  };

  return (
    <Button 
      onClick={handleSync}
      disabled={isLoading}
      variant={getVariant()}
      size="sm"
    >
      {getIcon()}
      {isLoading ? 'Syncing...' : 'Sync User'}
    </Button>
  );
} 