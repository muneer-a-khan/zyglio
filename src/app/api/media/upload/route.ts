import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { storageService } from '@/lib/storage-service'
import { databaseService } from '@/lib/database'
import { z } from 'zod'

const uploadSchema = z.object({
  folder: z.string().optional().default('general'),
  bucket: z.string().optional(),
  extractMetadata: z.boolean().optional().default(true),
  generateThumbnail: z.boolean().optional().default(false),
})

export async function POST(request: NextRequest) {
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
    const user = await databaseService.getOrCreateUser(session.user.email, session.user.name)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    // Parse options
    const optionsJson = formData.get('options') as string
    let options = {}
    
    if (optionsJson) {
      try {
        const parsedOptions = JSON.parse(optionsJson)
        options = uploadSchema.parse(parsedOptions)
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid options format' },
          { status: 400 }
        )
      }
    }

    // Validate file types and sizes
    const maxFileSize = 100 * 1024 * 1024 // 100MB
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm', 'video/quicktime',
      'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a',
      'application/pdf', 'text/plain', 'application/json'
    ]

    for (const file of files) {
      if (file.size > maxFileSize) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds maximum size of 100MB` },
          { status: 400 }
        )
      }

      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `File type ${file.type} is not allowed` },
          { status: 400 }
        )
      }
    }

    // Upload files
    const uploadResults = []
    const uploadErrors = []

    for (const file of files) {
      try {
        const mediaFile = await storageService.uploadFile(file, user.id, options)
        
        // Return the uploaded file info directly (no database storage needed)
        uploadResults.push({
          id: mediaFile.id,
          ...mediaFile,
          success: true
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed'
        uploadErrors.push({
          fileName: file.name,
          error: errorMessage
        })
      }
    }

    // Return results
    const response = {
      success: uploadResults.length > 0,
      uploaded: uploadResults,
      errors: uploadErrors,
      summary: {
        total: files.length,
        successful: uploadResults.length,
        failed: uploadErrors.length
      }
    }

    const status = uploadErrors.length === 0 ? 200 : 207 // Multi-status if some failed
    return NextResponse.json(response, { status })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
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
    const user = await databaseService.getOrCreateUser(session.user.email, session.user.name)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const folder = searchParams.get('folder') || 'general'
    const fileType = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Since we're using Supabase storage directly, redirect to the main media API
    return NextResponse.redirect(new URL('/api/media', request.url))

  } catch (error) {
    console.error('Get files error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Health check for upload service
export async function HEAD() {
  try {
    // Check if storage service is accessible
    // This is a simple health check
    return new NextResponse(null, { 
      status: 200,
      headers: {
        'X-Upload-Service': 'healthy',
        'X-Max-File-Size': (100 * 1024 * 1024).toString(),
        'X-Allowed-Types': 'image/*,video/*,audio/*,application/pdf,text/plain'
      }
    })
  } catch (error) {
    return new NextResponse(null, { status: 503 })
  }
} 