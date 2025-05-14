import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const StorageSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    bucketUrl?: string;
  } | null>(null);

  const setupStorage = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/storage/setup');
      const data = await response.json();

      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Storage Bucket Setup</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-gray-600">
          If you're having issues uploading files, you can use this utility to ensure your Supabase 
          storage bucket is correctly configured with public access.
        </p>

        <Button 
          onClick={setupStorage} 
          disabled={isLoading}
          className="mb-4"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting up storage...
            </>
          ) : (
            'Configure Storage Bucket'
          )}
        </Button>

        {result && (
          <div className={`p-4 rounded-md ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-400" />
                )}
              </div>
              <div className="ml-3">
                <h3 className={`text-sm font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                  {result.success ? 'Storage configured successfully' : 'Configuration failed'}
                </h3>
                <div className={`mt-2 text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                  <p>{result.message}</p>
                  {result.bucketUrl && (
                    <p className="mt-2">
                      Bucket URL: <span className="font-mono text-xs break-all">{result.bucketUrl}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StorageSetup; 