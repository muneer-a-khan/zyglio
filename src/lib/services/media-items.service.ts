/**
 * Media Items Service
 * Handles saving and retrieving media items for procedures
 */

export interface MediaItem {
  id: string;
  type: string;
  caption?: string;
  url: string;
  filePath?: string;
  createdAt?: string | Date;
  presenter?: string;
}

export class MediaItemsService {
  /**
   * Saves media items for a procedure
   */
  async saveMediaItems(mediaItems: MediaItem[]): Promise<void> {
    try {
      // Get current task ID from localStorage or sessionStorage
      const taskId = localStorage.getItem('currentTaskId') || sessionStorage.getItem('currentTaskId');

      if (!taskId) {
        throw new Error('No task ID available for saving media items');
      }

      const response = await fetch('/api/procedures/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId,
          mediaItems: mediaItems.map(item => ({
            type: this.mapMediaType(item.type),
            caption: item.caption || '',
            url: item.url,
            relevance: 'primary'
          }))
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to save media items');
      }
    } catch (error) {
      console.error('Error saving media items:', error);
      throw error;
    }
  }

  /**
   * Gets media items for a procedure
   */
  async getMediaItems(taskId: string): Promise<MediaItem[]> {
    try {
      const response = await fetch(`/api/procedures/media?taskId=${taskId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch media items');
      }

      const data = await response.json();
      return data.mediaItems.map((item: any) => ({
        id: item.id,
        type: this.mapMediaTypeReverse(item.type),
        caption: item.caption,
        url: item.url,
        createdAt: item.createdAt
      }));
    } catch (error) {
      console.error('Error getting media items:', error);
      return [];
    }
  }

  /**
   * Maps frontend media types to database types
   */
  private mapMediaType(type: string): string {
    const typeMap: Record<string, string> = {
      'image': 'IMAGE',
      'video': 'VIDEO',
      'audio': 'AUDIO',
      'document': 'DOCUMENT',
      'other': 'OTHER'
    };
    return typeMap[type.toLowerCase()] || 'OTHER';
  }

  /**
   * Maps database media types to frontend types
   */
  private mapMediaTypeReverse(type: string): string {
    const typeMap: Record<string, string> = {
      'IMAGE': 'image',
      'VIDEO': 'video',
      'AUDIO': 'audio',
      'DOCUMENT': 'document',
      'OTHER': 'other'
    };
    return typeMap[type] || 'other';
  }
}

export const mediaItemsService = new MediaItemsService(); 