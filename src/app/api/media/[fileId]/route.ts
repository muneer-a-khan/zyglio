import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { storageService } from '@/lib/storage-service'
import { databaseService } from '@/lib/database'
import { z } from 'zod'

const updateSchema = z.object({
  originalName: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

interface RouteParams {
  params: {
    fileId: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user from database
    const user = await databaseService.getUserByEmail(session.user.email)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get file from database
    const file = await databaseService.getMediaFile(params.fileId)
    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Check ownership
    if (file.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get file metadata from storage
    try {
      const storageMetadata = await storageService.getFileMetadata(file.bucket, file.path)
      
      return NextResponse.json({
        ...file,
        storageMetadata
      })
    } catch (error) {
      // Return database record even if storage metadata fails
      return NextResponse.json(file)
    }

  } catch (error) {
    console.error('Get file error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user from database
    const user = await databaseService.getUserByEmail(session.user.email)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()
    const updateData = updateSchema.parse(body)

    // Get file from database
    const file = await databaseService.getMediaFile(params.fileId)
    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Check ownership
    if (file.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Update file in database
    const updatedFile = await databaseService.updateMediaFile(params.fileId, updateData)

    return NextResponse.json(updatedFile)

  } catch (error) {
    console.error('Update file error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user from database
    const user = await databaseService.getUserByEmail(session.user.email)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get file from database
    const file = await databaseService.getMediaFile(params.fileId)
    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Check ownership
    if (file.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Delete from storage first
    try {
      await storageService.deleteFile(file.bucket, file.path)
    } catch (error) {
      console.warn('Failed to delete from storage:', error)
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    await databaseService.deleteMediaFile(params.fileId)

    return NextResponse.json({ 
      success: true, 
      message: 'File deleted successfully' 
    })

  } catch (error) {
    console.error('Delete file error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 