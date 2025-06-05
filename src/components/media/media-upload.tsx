'use client'

import React, { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, File, Image, Video, Music, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { storageService, MediaFile, UploadOptions, UploadProgress } from '@/lib/storage-service'
import { cn } from '@/lib/utils'

interface MediaUploadProps {
  userId: string
  onUploadComplete?: (files: MediaFile[]) => void
  onUploadError?: (error: string) => void
  options?: UploadOptions
  multiple?: boolean
  className?: string
}

interface UploadingFile {
  file: File
  progress: number
  status: 'uploading' | 'complete' | 'error'
  error?: string
  result?: MediaFile
  id: string
}

export function MediaUpload({
  userId,
  onUploadComplete,
  onUploadError,
  options = {},
  multiple = true,
  className
}: MediaUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [isDragActive, setIsDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-5 w-5" />
    if (fileType.startsWith('video/')) return <Video className="h-5 w-5" />
    if (fileType.startsWith('audio/')) return <Music className="h-5 w-5" />
    return <FileText className="h-5 w-5" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const uploadFile = useCallback(async (file: File) => {
    const uploadId = `${Date.now()}-${Math.random().toString(36).substring(7)}`
    
    // Add file to uploading list
    setUploadingFiles(prev => [...prev, {
      file,
      progress: 0,
      status: 'uploading',
      id: uploadId
    }])

    try {
      const uploadOptions: UploadOptions = {
        ...options,
        extractMetadata: true,
        onProgress: (progress: UploadProgress) => {
          setUploadingFiles(prev => prev.map(f => 
            f.id === uploadId 
              ? { ...f, progress: progress.percentage }
              : f
          ))
        }
      }

      const result = await storageService.uploadFile(file, userId, uploadOptions)

      setUploadingFiles(prev => prev.map(f => 
        f.id === uploadId 
          ? { ...f, status: 'complete', progress: 100, result }
          : f
      ))

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      
      setUploadingFiles(prev => prev.map(f => 
        f.id === uploadId 
          ? { ...f, status: 'error', error: errorMessage }
          : f
      ))

      onUploadError?.(errorMessage)
      throw error
    }
  }, [userId, options, onUploadError])

  const handleFiles = useCallback(async (files: File[]) => {
    try {
      const uploadPromises = files.map(uploadFile)
      const results = await Promise.all(uploadPromises)
      
      onUploadComplete?.(results.filter(Boolean))
      
      // Clear completed uploads after a delay
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.status !== 'complete'))
      }, 3000)
    } catch (error) {
      console.error('Upload error:', error)
    }
  }, [uploadFile, onUploadComplete])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setIsDragActive(false)
    handleFiles(acceptedFiles)
  }, [handleFiles])

  const { getRootProps, getInputProps, isDragActive: dropzoneActive } = useDropzone({
    onDrop,
    multiple,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    accept: options.allowedTypes ? {
      '*/*': options.allowedTypes
    } : undefined,
    maxSize: options.maxSize
  })

  const removeUploadingFile = (id: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== id))
  }

  const retryUpload = (id: string) => {
    const file = uploadingFiles.find(f => f.id === id)
    if (file) {
      uploadFile(file.file)
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Zone */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              dropzoneActive || isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            )}
          >
            <input {...getInputProps()} ref={fileInputRef} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {dropzoneActive 
                  ? 'Drop files here...'
                  : 'Drag & drop files here, or click to select'
                }
              </p>
              <p className="text-sm text-gray-500">
                {multiple ? 'Upload multiple files' : 'Upload a single file'}
                {options.maxSize && (
                  <span className="block">
                    Max size: {formatFileSize(options.maxSize)}
                  </span>
                )}
              </p>
              {options.allowedTypes && options.allowedTypes[0] !== '*' && (
                <div className="flex flex-wrap gap-1 justify-center">
                  {options.allowedTypes.map((type, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-4">Uploading Files</h3>
            <div className="space-y-3">
              {uploadingFiles.map((uploadFile) => (
                <div key={uploadFile.id} className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {getFileIcon(uploadFile.file.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate">
                        {uploadFile.file.name}
                      </p>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          {formatFileSize(uploadFile.file.size)}
                        </span>
                        
                        {uploadFile.status === 'complete' && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        
                        {uploadFile.status === 'error' && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeUploadingFile(uploadFile.id)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {uploadFile.status === 'uploading' && (
                      <Progress value={uploadFile.progress} className="h-2" />
                    )}
                    
                    {uploadFile.status === 'error' && (
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-red-500">{uploadFile.error}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => retryUpload(uploadFile.id)}
                          className="text-xs h-6"
                        >
                          Retry
                        </Button>
                      </div>
                    )}
                    
                    {uploadFile.status === 'complete' && uploadFile.result && (
                      <p className="text-xs text-green-600">
                        Upload complete - {uploadFile.result.name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default MediaUpload 