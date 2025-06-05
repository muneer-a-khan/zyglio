import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * API endpoint to save media items for a task
 * POST /api/media/items
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId, mediaItems } = await request.json();

    if (!taskId || !Array.isArray(mediaItems)) {
      return NextResponse.json({ 
        error: 'Missing required parameters: taskId, mediaItems' 
      }, { status: 400 });
    }

    console.log(`API: Saving ${mediaItems.length} media items for task ${taskId}`);

    // Delete existing media items for this task
    await prisma.mediaItem.deleteMany({
      where: { taskId }
    });

    // Create new media items
    if (mediaItems.length > 0) {
      // Map MediaType enum values
      const mapMediaType = (type: string) => {
        switch (type) {
          case 'IMAGE': return 'IMAGE';
          case 'VIDEO': return 'VIDEO';
          case 'AUDIO': return 'AUDIO';
          case 'PDF': return 'PDF';
          default: return 'IMAGE';
        }
      };

      // Create media items
      await Promise.all(mediaItems.map(async (item: any) => {
        await prisma.mediaItem.create({
          data: {
            id: item.id,
            type: mapMediaType(item.type),
            caption: item.caption || null,
            url: item.url,
            taskId: taskId
          }
        });
      }));
    }

    console.log('API: Media items saved successfully');

    return NextResponse.json({
      success: true,
      message: 'Media items saved successfully',
      count: mediaItems.length
    });

  } catch (error) {
    console.error('Error saving media items via API:', error);
    return NextResponse.json({
      error: 'Failed to save media items',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 