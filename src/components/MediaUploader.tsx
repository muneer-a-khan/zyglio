import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Image, FileText, Video, File, X, Music } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaFile {
  id: string;
  name: string;
  type: string;
  url: string;
  size: string;
}

const MediaUploader = () => {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleFiles = (files: FileList) => {
    const newMediaFiles: MediaFile[] = [];

    Array.from(files).forEach((file) => {
      const id = `file-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;
      newMediaFiles.push({
        id,
        name: file.name,
        type: file.type,
        url: URL.createObjectURL(file),
        size: formatFileSize(file.size),
      });
    });

    setMediaFiles((prev) => [...prev, ...newMediaFiles]);
  };

  const removeFile = (id: string) => {
    setMediaFiles((prev) => {
      const fileToRemove = prev.find((file) => file.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.url);
      }
      return prev.filter((file) => file.id !== id);
    });
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/"))
      return <Image className="h-6 w-6 text-blue-500" />;
    if (type.startsWith("video/"))
      return <Video className="h-6 w-6 text-red-500" />;
    if (type.startsWith("audio/"))
      return <Music className="h-6 w-6 text-green-500" />;
    if (type.includes("pdf"))
      return <FileText className="h-6 w-6 text-orange-500" />;
    return <File className="h-6 w-6 text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors",
          isDragging ? "border-blue-400 bg-blue-50" : "border-gray-300"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleFileDrop}
        onClick={() => document.getElementById("file-upload")?.click()}
      >
        <div className="flex flex-col items-center space-y-2">
          <div className="p-3 bg-blue-100 rounded-full">
            <Upload className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="font-medium text-lg">Upload Media Files</h3>
          <p className="text-sm text-muted-foreground">
            Drag and drop files here or click to browse
          </p>
          <div className="text-xs text-muted-foreground mt-2">
            Supports images, videos, PDFs and audio files
          </div>
        </div>
        <Input
          id="file-upload"
          type="file"
          className="hidden"
          multiple
          onChange={handleFileChange}
        />
      </div>

      {mediaFiles.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-3">
            Uploaded Media ({mediaFiles.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mediaFiles.map((file) => (
              <Card key={file.id} className="overflow-hidden">
                <CardContent className="p-3 relative">
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-6 w-6 absolute top-1 right-1 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>

                  {file.type.startsWith("image/") ? (
                    <div className="aspect-video w-full overflow-hidden mb-2">
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="p-2 flex items-center">
                      <div className="p-2 bg-gray-100 rounded mr-3">
                        {getFileIcon(file.type)}
                      </div>
                      <div className="truncate flex-1">
                        <p className="text-sm font-medium truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {file.size} • {file.type.split("/")[1].toUpperCase()}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaUploader;
