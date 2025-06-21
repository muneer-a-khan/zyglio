import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface MediaFile {
  id: string
  name: string
  originalName: string
  url: string
  type: string
  size: number
  bucket: string
  path: string
  metadata?: {
    width?: number
    height?: number
    duration?: number
    transcript?: string
  }
  createdAt: Date
  updatedAt: Date
  canDelete?: boolean // Whether the current user can delete this file
}

export interface UploadOptions {
  bucket?: string
  folder?: string
  maxSize?: number
  allowedTypes?: string[]
  generateThumbnail?: boolean
  extractMetadata?: boolean
  onProgress?: (progress: UploadProgress) => void
}

class StorageService {
  private readonly buckets = {
    AUDIO: 'audio-files',
    IMAGES: 'image-files', 
    VIDEOS: 'video-files',
    DOCUMENTS: 'document-files',
    AVATARS: 'avatars'
  }

  private readonly defaultOptions: Required<Omit<UploadOptions, 'onProgress'>> = {
    bucket: this.buckets.DOCUMENTS,
    folder: 'general',
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['*'],
    generateThumbnail: false,
    extractMetadata: false
  }

  /**
   * Upload a file to Supabase storage
   */
  async uploadFile(
    file: File, 
    userId: string,
    options: UploadOptions = {}
  ): Promise<MediaFile> {
    try {
      const opts = { ...this.defaultOptions, ...options }
      
      // Validate file
      this.validateFile(file, opts)
      
      // Generate unique filename
      const fileExtension = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`
      const filePath = `${opts.folder}/${userId}/${fileName}`
      
      // Determine bucket based on file type
      const bucket = this.determineBucket(file.type, opts.bucket)
      
      // Upload to Supabase with progress tracking
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        throw new Error(`Upload failed: ${error.message}`)
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      // Extract metadata if requested
      let metadata = {}
      if (opts.extractMetadata) {
        metadata = await this.extractMetadata(file, urlData.publicUrl)
      }

      // Create media file record
      const mediaFile: MediaFile = {
        id: data.id || fileName,
        name: fileName,
        originalName: file.name,
        url: urlData.publicUrl,
        type: file.type,
        size: file.size,
        bucket,
        path: filePath,
        metadata,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      return mediaFile
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(
    files: FileList | File[],
    userId: string,
    options: UploadOptions = {}
  ): Promise<MediaFile[]> {
    const fileArray = Array.from(files)
    const uploadPromises = fileArray.map(file => 
      this.uploadFile(file, userId, options)
    )
    
    return Promise.all(uploadPromises)
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) {
      throw new Error(`Delete failed: ${error.message}`)
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(bucket: string, path: string) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .info(path)

    if (error) {
      throw new Error(`Failed to get metadata: ${error.message}`)
    }

    return data
  }

  /**
   * List files in a folder
   */
  async listFiles(bucket: string, folder: string, limit = 100) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder, {
        limit,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`)
    }

    return data
  }

  /**
   * Generate signed URL for temporary access
   */
  async getSignedUrl(bucket: string, path: string, expiresIn = 3600) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`)
    }

    return data.signedUrl
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: File, options: Required<Omit<UploadOptions, 'onProgress'>>) {
    // Check file size
    if (file.size > options.maxSize) {
      throw new Error(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds limit of ${(options.maxSize / 1024 / 1024).toFixed(2)}MB`)
    }

    // Check file type
    if (options.allowedTypes[0] !== '*') {
      const isAllowed = options.allowedTypes.some(type => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.slice(0, -1))
        }
        return file.type === type
      })

      if (!isAllowed) {
        throw new Error(`File type ${file.type} is not allowed`)
      }
    }
  }

  /**
   * Determine appropriate bucket based on file type
   */
  private determineBucket(fileType: string, defaultBucket: string): string {
    if (fileType.startsWith('audio/')) return this.buckets.AUDIO
    if (fileType.startsWith('image/')) return this.buckets.IMAGES
    if (fileType.startsWith('video/')) return this.buckets.VIDEOS
    return defaultBucket
  }

  /**
   * Extract metadata from file
   */
  private async extractMetadata(file: File, url: string): Promise<any> {
    const metadata: any = {}

    try {
      if (file.type.startsWith('image/')) {
        const img = new Image()
        img.src = URL.createObjectURL(file)
        await new Promise((resolve) => {
          img.onload = () => {
            metadata.width = img.width
            metadata.height = img.height
            URL.revokeObjectURL(img.src)
            resolve(void 0)
          }
        })
      } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video')
        video.src = URL.createObjectURL(file)
        await new Promise((resolve) => {
          video.onloadedmetadata = () => {
            metadata.width = video.videoWidth
            metadata.height = video.videoHeight
            metadata.duration = video.duration
            URL.revokeObjectURL(video.src)
            resolve(void 0)
          }
        })
      } else if (file.type.startsWith('audio/')) {
        const audio = document.createElement('audio')
        audio.src = URL.createObjectURL(file)
        await new Promise((resolve) => {
          audio.onloadedmetadata = () => {
            metadata.duration = audio.duration
            URL.revokeObjectURL(audio.src)
            resolve(void 0)
          }
        })
      }
    } catch (error) {
      console.warn('Failed to extract metadata:', error)
    }

    return metadata
  }

  /**
   * Create thumbnail for images/videos
   */
  async createThumbnail(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      
      if (file.type.startsWith('image/')) {
        const img = new Image()
        img.onload = () => {
          const maxSize = 200
          const ratio = Math.min(maxSize / img.width, maxSize / img.height)
          canvas.width = img.width * ratio
          canvas.height = img.height * ratio
          
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          canvas.toBlob(resolve, 'image/jpeg', 0.8)
          URL.revokeObjectURL(img.src)
        }
        img.onerror = reject
        img.src = URL.createObjectURL(file)
      } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video')
        video.onloadeddata = () => {
          video.currentTime = 1 // Get frame at 1 second
        }
        video.onseeked = () => {
          const maxSize = 200
          const ratio = Math.min(maxSize / video.videoWidth, maxSize / video.videoHeight)
          canvas.width = video.videoWidth * ratio
          canvas.height = video.videoHeight * ratio
          
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          canvas.toBlob(resolve, 'image/jpeg', 0.8)
          URL.revokeObjectURL(video.src)
        }
        video.onerror = reject
        video.src = URL.createObjectURL(file)
      } else {
        reject(new Error('Unsupported file type for thumbnail'))
      }
    })
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(userId: string) {
    const stats = {
      totalFiles: 0,
      totalSize: 0,
      byType: {
        audio: { count: 0, size: 0 },
        image: { count: 0, size: 0 },
        video: { count: 0, size: 0 },
        document: { count: 0, size: 0 }
      }
    }

    for (const [type, bucket] of Object.entries(this.buckets)) {
      try {
        const files = await this.listFiles(bucket, `general/${userId}`, 1000)
        const bucketStats = files.reduce((acc, file) => ({
          count: acc.count + 1,
          size: acc.size + (file.metadata?.size || 0)
        }), { count: 0, size: 0 })

        stats.totalFiles += bucketStats.count
        stats.totalSize += bucketStats.size

        const typeKey = type.toLowerCase().replace('s', '') as keyof typeof stats.byType
        if (stats.byType[typeKey]) {
          stats.byType[typeKey] = bucketStats
        }
      } catch (error) {
        console.warn(`Failed to get stats for ${bucket}:`, error)
      }
    }

    return stats
  }
}

export const storageService = new StorageService()
export default storageService 