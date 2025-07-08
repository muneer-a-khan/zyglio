import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { processMediaContent, MediaProcessingJob } from '@/lib/media-processor';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * API endpoint to start background processing of uploaded media
 * POST /api/media/process
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mediaItemId, taskId } = await request.json();

    if (!mediaItemId || !taskId) {
      return NextResponse.json({ 
        error: 'Missing required parameters: mediaItemId, taskId' 
      }, { status: 400 });
    }

    // Get the media item details
    const mediaItem = await prisma.mediaItem.findUnique({
      where: { id: mediaItemId }
    });

    if (!mediaItem) {
      return NextResponse.json({ error: 'Media item not found' }, { status: 404 });
    }

    // Create processing job with user info for SSE broadcasting
    const job: MediaProcessingJob = {
      mediaItemId: mediaItem.id,
      mediaType: mediaItem.type,
      url: mediaItem.url,
      taskId,
      userId: session.user.id, // Include user ID for SSE targeting
      filename: mediaItem.caption || 'Unnamed file' // Include filename for better UX
    };

    // Initialize processing status
    await prisma.parsedMediaContent.create({
      data: {
        mediaItemId,
        contentType: 'pending',
        extractedText: '',
        processingStatus: 'pending'
      }
    });

    // Start background processing (don't await - let it run in background)
    processMediaContent(job).catch(error => {
      console.error(`Background processing failed for media ${mediaItemId}:`, error);
    });

    return NextResponse.json({
      success: true,
      message: 'Media processing started',
      mediaItemId,
      status: 'processing'
    });

  } catch (error) {
    console.error('Error starting media processing:', error);
    return NextResponse.json({
      error: 'Failed to start processing',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Get processing status for media items
 * GET /api/media/process?taskId=...
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'taskId parameter required' }, { status: 400 });
    }

    // Get all media items and their processing status for this task
    const mediaItems = await prisma.mediaItem.findMany({
      where: { taskId },
      include: {
        ParsedMediaContent: {
          select: {
            processingStatus: true,
            errorMessage: true,
            summary: true,
            keyTopics: true,
            confidence: true,
            processingTime: true,
            updatedAt: true
          }
        }
      }
    });

    const processingStatus = mediaItems.map(item => ({
      mediaItemId: item.id,
      filename: item.caption || 'Unnamed file',
      type: item.type,
      status: item.ParsedMediaContent?.[0]?.processingStatus || 'not_started',
      errorMessage: item.ParsedMediaContent?.[0]?.errorMessage,
      summary: item.ParsedMediaContent?.[0]?.summary,
              keyTopics: item.ParsedMediaContent?.[0]?.keyTopics || [],
        confidence: item.ParsedMediaContent?.[0]?.confidence,
              processingTime: item.ParsedMediaContent?.[0]?.processingTime,
        lastUpdated: item.ParsedMediaContent?.[0]?.updatedAt
    }));

    // Check if all media is processed
    const totalMedia = mediaItems.length;
    const completedMedia = processingStatus.filter(item => item.status === 'completed').length;
    const failedMedia = processingStatus.filter(item => item.status === 'failed').length;
    const processingMedia = processingStatus.filter(item => item.status === 'processing').length;

    return NextResponse.json({
      success: true,
      processingStatus,
      summary: {
        total: totalMedia,
        completed: completedMedia,
        failed: failedMedia,
        processing: processingMedia,
        pending: totalMedia - completedMedia - failedMedia - processingMedia,
        allCompleted: completedMedia + failedMedia === totalMedia
      }
    });

  } catch (error) {
    console.error('Error getting processing status:', error);
    return NextResponse.json({
      error: 'Failed to get processing status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 