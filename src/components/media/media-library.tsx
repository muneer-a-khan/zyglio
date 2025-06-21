'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Search, Filter, Grid, List, Download, Trash2, Eye, Play, FileText, Image, Video, Music } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { MediaFile } from '@/lib/storage-service'
import { cn, formatTimestamp } from '@/lib/utils'

interface MediaLibraryProps {
  files: MediaFile[]
  onFileSelect?: (file: MediaFile) => void
  onFilesSelect?: (files: MediaFile[]) => void
  onFileDelete?: (file: MediaFile) => void
  onBulkDelete?: (files: MediaFile[]) => void
  selectable?: boolean
  multiSelect?: boolean
  className?: string
}

type ViewMode = 'grid' | 'list'
type SortBy = 'name' | 'size' | 'type' | 'created'
type SortOrder = 'asc' | 'desc'
type FilterType = 'all' | 'image' | 'video' | 'audio' | 'document'

export function MediaLibrary({
  files,
  onFileSelect,
  onFilesSelect,
  onFileDelete,
  onBulkDelete,
  selectable = false,
  multiSelect = false,
  className
}: MediaLibraryProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortBy>('created')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null)

  const getFileIcon = (fileType: string, size = 'h-5 w-5') => {
    if (fileType.startsWith('image/')) return <Image className={size} />
    if (fileType.startsWith('video/')) return <Video className={size} />
    if (fileType.startsWith('audio/')) return <Music className={size} />
    return <FileText className={size} />
  }

  const getFileTypeLabel = (fileType: string) => {
    if (fileType.startsWith('image/')) return 'Image'
    if (fileType.startsWith('video/')) return 'Video'
    if (fileType.startsWith('audio/')) return 'Audio'
    return 'Document'
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const filteredAndSortedFiles = useMemo(() => {
    let filtered = files

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(file =>
        file.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(file => {
        switch (filterType) {
          case 'image': return file.type.startsWith('image/')
          case 'video': return file.type.startsWith('video/')
          case 'audio': return file.type.startsWith('audio/')
          case 'document': return !file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.type.startsWith('audio/')
          default: return true
        }
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case 'name':
          aValue = a.originalName.toLowerCase()
          bValue = b.originalName.toLowerCase()
          break
        case 'size':
          aValue = a.size
          bValue = b.size
          break
        case 'type':
          aValue = a.type
          bValue = b.type
          break
        case 'created':
        default:
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [files, searchQuery, filterType, sortBy, sortOrder])

  const handleFileSelect = (file: MediaFile) => {
    if (!selectable) return

    if (multiSelect) {
      const newSelected = new Set(selectedFiles)
      if (newSelected.has(file.id)) {
        newSelected.delete(file.id)
      } else {
        newSelected.add(file.id)
      }
      setSelectedFiles(newSelected)
      
      const selectedFileObjects = files.filter(f => newSelected.has(f.id))
      onFilesSelect?.(selectedFileObjects)
    } else {
      setSelectedFiles(new Set([file.id]))
      onFileSelect?.(file)
    }
  }

  const handleSelectAll = () => {
    if (selectedFiles.size === filteredAndSortedFiles.length) {
      setSelectedFiles(new Set())
      onFilesSelect?.([])
    } else {
      const allIds = new Set(filteredAndSortedFiles.map(f => f.id))
      setSelectedFiles(allIds)
      onFilesSelect?.(filteredAndSortedFiles)
    }
  }

  const handleBulkDelete = () => {
    const filesToDelete = files.filter(f => selectedFiles.has(f.id) && f.canDelete)
    onBulkDelete?.(filesToDelete)
    setSelectedFiles(new Set())
  }

  const MediaPreview = ({ file }: { file: MediaFile }) => {
    if (file.type.startsWith('image/')) {
      return (
        <img
          src={file.url}
          alt={file.originalName}
          className="max-w-full max-h-96 object-contain"
        />
      )
    }

    if (file.type.startsWith('video/')) {
      return (
        <video
          src={file.url}
          controls
          className="max-w-full max-h-96"
        >
          Your browser does not support the video tag.
        </video>
      )
    }

    if (file.type.startsWith('audio/')) {
      return (
        <div className="flex flex-col items-center space-y-4">
          <Music className="h-16 w-16 text-gray-400" />
          <audio src={file.url} controls className="w-full max-w-md" />
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center space-y-4">
        <FileText className="h-16 w-16 text-gray-400" />
        <p className="text-center text-gray-600">
          Preview not available for this file type
        </p>
      </div>
    )
  }

  const GridView = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {filteredAndSortedFiles.map((file) => (
        <Card
          key={file.id}
          className={cn(
            'cursor-pointer transition-all hover:shadow-md',
            selectedFiles.has(file.id) && 'ring-2 ring-blue-500'
          )}
          onClick={() => handleFileSelect(file)}
        >
          <CardContent className="p-3">
            <div className="space-y-2">
              {/* File preview/icon */}
              <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                {file.type.startsWith('image/') ? (
                  <img
                    src={file.url}
                    alt={file.originalName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getFileIcon(file.type, 'h-8 w-8 text-gray-400')
                )}
              </div>

              {/* File info */}
              <div className="space-y-1">
                <p className="text-xs font-medium truncate" title={file.originalName}>
                  {file.originalName}
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {getFileTypeLabel(file.type)}
                  </Badge>
                  {selectable && (
                    <Checkbox
                      checked={selectedFiles.has(file.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleFileSelect(file);
                        } else {
                          handleFileSelect(file);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.size)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-center space-x-1">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPreviewFile(file)
                      }}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>{file.originalName}</DialogTitle>
                    </DialogHeader>
                    <div className="flex justify-center">
                      <MediaPreview file={file} />
                    </div>
                  </DialogContent>
                </Dialog>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(file.url, '_blank')
                        }}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {onFileDelete && file.canDelete && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation()
                            onFileDelete(file)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const ListView = () => (
    <div className="space-y-2">
      {filteredAndSortedFiles.map((file) => (
        <Card
          key={file.id}
          className={cn(
            'cursor-pointer transition-all hover:shadow-sm',
            selectedFiles.has(file.id) && 'ring-2 ring-blue-500'
          )}
          onClick={() => handleFileSelect(file)}
        >
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              {selectable && (
                <Checkbox
                  checked={selectedFiles.has(file.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleFileSelect(file);
                    } else {
                      handleFileSelect(file);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              )}

              <div className="flex-shrink-0">
                {getFileIcon(file.type)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.originalName}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>{getFileTypeLabel(file.type)}</span>
                  <span>{formatFileSize(file.size)}</span>
                  <span>{formatTimestamp(file.createdAt)}</span>
                  {file.metadata?.duration && (
                    <span>{Math.round(file.metadata.duration)}s</span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPreviewFile(file)
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>{file.originalName}</DialogTitle>
                    </DialogHeader>
                    <div className="flex justify-center">
                      <MediaPreview file={file} />
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    window.open(file.url, '_blank')
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>

                {onFileDelete && file.canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                    onClick={(e) => {
                      e.stopPropagation()
                      onFileDelete(file)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header & Controls */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Media Library</h2>
          <div className="flex items-center space-x-2">
            {multiSelect && selectedFiles.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected ({selectedFiles.size})
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex gap-2">
            <Select value={filterType} onValueChange={(value: FilterType) => setFilterType(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Files</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
              </SelectContent>
            </Select>

            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [newSortBy, newSortOrder] = value.split('-') as [SortBy, SortOrder]
              setSortBy(newSortBy)
              setSortOrder(newSortOrder)
            }}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created-desc">Newest First</SelectItem>
                <SelectItem value="created-asc">Oldest First</SelectItem>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
                <SelectItem value="size-desc">Largest First</SelectItem>
                <SelectItem value="size-asc">Smallest First</SelectItem>
                <SelectItem value="type-asc">Type A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bulk selection controls */}
        {multiSelect && filteredAndSortedFiles.length > 0 && (
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
            >
              {selectedFiles.size === filteredAndSortedFiles.length ? 'Deselect All' : 'Select All'}
            </Button>
            <span className="text-sm text-gray-500">
              {selectedFiles.size} of {filteredAndSortedFiles.length} selected
            </span>
          </div>
        )}
      </div>

      {/* Files Display */}
      {filteredAndSortedFiles.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-600">No files found</p>
            <p className="text-gray-500">
              {searchQuery || filterType !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Upload some files to get started'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        viewMode === 'grid' ? <GridView /> : <ListView />
      )}
    </div>
  )
}

export default MediaLibrary 