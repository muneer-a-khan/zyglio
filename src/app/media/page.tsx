"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Upload, FolderOpen, BarChart3, Trash2, RefreshCw } from "lucide-react";
import MediaUpload from "@/components/media/media-upload";
import MediaLibrary from "@/components/media/media-library";
import { MediaFile } from "@/lib/storage-service";
import { toast } from "sonner";

export default function MediaPage() {
  const { data: session } = useSession();
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadStats, setUploadStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    byType: {
      audio: { count: 0, size: 0 },
      image: { count: 0, size: 0 },
      video: { count: 0, size: 0 },
      document: { count: 0, size: 0 },
    },
  });

  const fetchFiles = async () => {
    if (!session?.user) return;

    try {
      setLoading(true);
      const response = await fetch("/api/media");

      if (!response.ok) {
        throw new Error("Failed to fetch files");
      }

      const data = await response.json();
      
      // Transform mediaItems to match MediaFile interface
      const transformedFiles = (data.mediaItems || []).map((item: any) => ({
        id: item.id,
        name: item.caption || item.filePath || "Unknown",
        originalName: item.caption || item.filePath || "Unknown",
        url: item.url,
        type:
          item.type === "IMAGE"
            ? "image/jpeg"
            : item.type === "VIDEO"
              ? "video/mp4"
              : item.type === "AUDIO"
                ? "audio/mp3"
                : item.type === "PDF"
                  ? "application/pdf"
                  : "unknown",
        size: item.size || 1024 * 1024, // Default to 1MB if size not available
        bucket: "user-uploads",
        path: item.filePath || "",
        metadata: {},
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.createdAt),
      }));
      
      setFiles(transformedFiles);
      
      // Calculate stats from transformed files
      const stats = {
        totalFiles: transformedFiles.length,
        totalSize: transformedFiles.reduce((sum, file) => sum + file.size, 0),
        byType: {
          audio: {
            count: transformedFiles.filter(f => f.type.startsWith('audio/')).length,
            size: transformedFiles.filter(f => f.type.startsWith('audio/')).reduce((sum, file) => sum + file.size, 0)
          },
          image: {
            count: transformedFiles.filter(f => f.type.startsWith('image/')).length,
            size: transformedFiles.filter(f => f.type.startsWith('image/')).reduce((sum, file) => sum + file.size, 0)
          },
          video: {
            count: transformedFiles.filter(f => f.type.startsWith('video/')).length,
            size: transformedFiles.filter(f => f.type.startsWith('video/')).reduce((sum, file) => sum + file.size, 0)
          },
          document: {
            count: transformedFiles.filter(f => f.type === 'application/pdf' || (!f.type.startsWith('image/') && !f.type.startsWith('video/') && !f.type.startsWith('audio/'))).length,
            size: transformedFiles.filter(f => f.type === 'application/pdf' || (!f.type.startsWith('image/') && !f.type.startsWith('video/') && !f.type.startsWith('audio/'))).reduce((sum, file) => sum + file.size, 0)
          },
        },
      };
      
      setUploadStats(stats);
    } catch (error) {
      console.error("Error fetching files:", error);
      toast.error("Failed to load media files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [session]);

  const handleUploadComplete = (uploadedFiles: MediaFile[]) => {
    setFiles((prev) => [...uploadedFiles, ...prev]);
    setUploadStats((prev) => ({
      ...prev,
      totalFiles: prev.totalFiles + uploadedFiles.length,
      totalSize:
        prev.totalSize +
        uploadedFiles.reduce((sum, file) => sum + file.size, 0),
    }));
    toast.success(`Successfully uploaded ${uploadedFiles.length} file(s)`);
  };

  const handleUploadError = (error: string) => {
    toast.error(`Upload failed: ${error}`);
  };

  const handleFileDelete = async (file: MediaFile) => {
    try {
      const response = await fetch(`/api/media/${file.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete file");
      }

      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      setUploadStats((prev) => ({
        ...prev,
        totalFiles: prev.totalFiles - 1,
        totalSize: prev.totalSize - file.size,
      }));
      toast.success("File deleted successfully");
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
    }
  };

  const handleBulkDelete = async (filesToDelete: MediaFile[]) => {
    try {
      const deletePromises = filesToDelete.map((file) =>
        fetch(`/api/media/${file.id}`, { method: "DELETE" }),
      );

      await Promise.all(deletePromises);

      const deletedIds = new Set(filesToDelete.map((f) => f.id));
      setFiles((prev) => prev.filter((f) => !deletedIds.has(f.id)));

      const deletedSize = filesToDelete.reduce(
        (sum, file) => sum + file.size,
        0,
      );
      setUploadStats((prev) => ({
        ...prev,
        totalFiles: prev.totalFiles - filesToDelete.length,
        totalSize: prev.totalSize - deletedSize,
      }));

      toast.success(`Successfully deleted ${filesToDelete.length} file(s)`);
    } catch (error) {
      console.error("Error bulk deleting files:", error);
      toast.error("Failed to delete some files");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getUsagePercentage = (
    used: number,
    limit: number = 5 * 1024 * 1024 * 1024,
  ) => {
    return Math.round((used / limit) * 100);
  };

  if (!session) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
            <p className="text-gray-600">
              Please sign in to access the media library.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Media Library</h1>
          <p className="text-gray-600">
            Upload, manage, and organize your media files
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={fetchFiles} disabled={loading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uploadStats.totalFiles}</div>
            <div className="flex items-center mt-2">
              <FolderOpen className="h-4 w-4 text-gray-500 mr-1" />
              <span className="text-xs text-gray-500">All formats</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatFileSize(uploadStats.totalSize)}
            </div>
            <div className="flex items-center mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${Math.min(getUsagePercentage(uploadStats.totalSize), 100)}%`,
                  }}
                ></div>
              </div>
              <span className="text-xs text-gray-500">
                {getUsagePercentage(uploadStats.totalSize)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {uploadStats.byType.image.count}
            </div>
            <div className="text-xs text-gray-500">
              {formatFileSize(uploadStats.byType.image.size)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Videos & Audio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {uploadStats.byType.video.count + uploadStats.byType.audio.count}
            </div>
            <div className="text-xs text-gray-500">
              {formatFileSize(
                uploadStats.byType.video.size + uploadStats.byType.audio.size,
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="library" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="library" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Library
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-6">
          <MediaLibrary
            files={files}
            onFileDelete={handleFileDelete}
            onBulkDelete={handleBulkDelete}
            selectable={true}
            multiSelect={true}
          />
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload New Files</CardTitle>
            </CardHeader>
            <CardContent>
              <MediaUpload
                userId={session.user.email || ""}
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                multiple={true}
                options={{
                  maxSize: 100 * 1024 * 1024, // 100MB
                  extractMetadata: true,
                  allowedTypes: ["*"],
                }}
              />
            </CardContent>
          </Card>

          {/* Recent Uploads */}
          {files.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Uploads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {files.slice(0, 5).map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{file.originalName}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{formatFileSize(file.size)}</span>
                          <Badge variant="secondary">
                            {file.type.split("/")[0]}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFileDelete(file)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>File Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(uploadStats.byType).map(([type, stats]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="capitalize">
                          {type}
                        </Badge>
                        <span className="text-sm">{stats.count} files</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatFileSize(stats.size)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Storage Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Used Storage</span>
                    <span className="font-medium">
                      {formatFileSize(uploadStats.totalSize)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Available</span>
                    <span className="font-medium">
                      {formatFileSize(
                        5 * 1024 * 1024 * 1024 - uploadStats.totalSize,
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(getUsagePercentage(uploadStats.totalSize), 100)}%`,
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 text-center">
                    {getUsagePercentage(uploadStats.totalSize)}% of 5GB used
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Filter large files
                    const largeFiles = files.filter(
                      (f) => f.size > 10 * 1024 * 1024,
                    ); // > 10MB
                    console.log("Large files:", largeFiles);
                    toast.info(
                      `Found ${largeFiles.length} files larger than 10MB`,
                    );
                  }}
                >
                  Find Large Files
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Find duplicates by name
                    const names = files.map((f) => f.originalName);
                    const duplicates = names.filter(
                      (name, index) => names.indexOf(name) !== index,
                    );
                    toast.info(
                      `Found ${new Set(duplicates).size} potential duplicate names`,
                    );
                  }}
                >
                  Check Duplicates
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Export file list
                    const fileList = files.map((f) => ({
                      name: f.originalName,
                      size: f.size,
                      type: f.type,
                      created: f.createdAt,
                    }));
                    console.log("File list:", fileList);
                    toast.success("File list logged to console");
                  }}
                >
                  Export List
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
