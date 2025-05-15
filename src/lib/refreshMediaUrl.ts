/**
 * Refreshes a signed URL for a media item when it expires
 * @param filePath The file path in the storage bucket
 * @returns A new signed URL for the file
 */
export async function refreshMediaUrl(filePath: string): Promise<string> {
  try {
    if (!filePath) {
      throw new Error('File path is required to refresh URL');
    }
    
    const response = await fetch('/api/storage/refresh-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filePath }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to refresh media URL');
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to refresh media URL');
    }
    
    return data.data.url;
  } catch (error) {
    console.error('Error refreshing media URL:', error);
    throw error;
  }
} 