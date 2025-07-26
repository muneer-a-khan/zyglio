"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, Video, Loader2, CheckCircle, AlertCircle, Brain } from "lucide-react";
import { toast } from "sonner";

interface MediaUploadPanelProps {
  onPromptUpdated?: (newPrompt: string) => void;
}

export default function MediaUploadPanel({ onPromptUpdated }: MediaUploadPanelProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [extractedContent, setExtractedContent] = useState<string>("");
  const [customContext, setCustomContext] = useState<string>("");
  const [isPromptUpdated, setIsPromptUpdated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(files);
  };

  const handleUpload = async () => {
    if (uploadedFiles.length === 0) {
      toast.error("No files selected", {
        description: "Please select at least one file to upload.",
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    uploadedFiles.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch("/api/hume/upload-media", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      setExtractedContent(data.content);
      
      toast.success("Files uploaded successfully", {
        description: `Processed ${uploadedFiles.length} file(s) and extracted content.`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload failed", {
        description: "Failed to upload and process files. Please try again.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdatePrompt = async () => {
    if (!extractedContent) {
      toast.error("No content to update", {
        description: "Please upload files or enter custom text first.",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const combinedContent = extractedContent + (customContext ? `\n\nAdditional Context:\n${customContext}` : "");
      
      const response = await fetch("/api/hume/update-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: combinedContent,
          description: `Enhanced with ${uploadedFiles.length} file(s) and custom content`
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update prompt");
      }

      const data = await response.json();
      setIsPromptUpdated(true);
      onPromptUpdated?.(combinedContent);
      
      toast.success("AI Knowledge Updated", {
        description: "New prompt and config versions created! Your assistant will now use the updated knowledge.",
      });
    } catch (error) {
      console.error("Prompt update error:", error);
      toast.error("Failed to update prompt", {
        description: "Could not update the AI assistant with the new content.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetUpload = () => {
    setUploadedFiles([]);
    setExtractedContent("");
    setCustomContext("");
    setIsPromptUpdated(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Brain className="h-5 w-5" />
          Knowledge Upload for AI Assistant
        </CardTitle>
        <p className="text-sm text-blue-600">
          Upload documents or videos to enhance your AI assistant's knowledge base. You can upload content before or during your conversation.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* File Upload Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-800">Upload Media Files</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.mp4,.avi,.mov,.mp3,.wav,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="flex-1"
            />
            <Button
              onClick={handleUpload}
              disabled={isUploading || uploadedFiles.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {isUploading ? "Processing..." : "Upload"}
            </Button>
          </div>
          
          {uploadedFiles.length > 0 && (
            <div className="text-sm text-blue-700">
              Selected files: {uploadedFiles.map(f => f.name).join(", ")}
            </div>
          )}
        </div>

        {/* Custom Context Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-green-600" />
            <span className="font-medium text-green-800">Add Custom Context</span>
          </div>
          
          <Textarea
            placeholder="Add any additional context, instructions, or knowledge you want your AI assistant to have..."
            value={customContext}
            onChange={(e) => setCustomContext(e.target.value)}
            rows={3}
            className="border-green-200 focus:border-green-400"
          />
        </div>

        {/* Extracted Content Preview */}
        {extractedContent && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-800">Extracted Content</span>
            </div>
            
            <div className="bg-white p-3 rounded border border-green-200 max-h-64 overflow-y-auto text-sm">
              <pre className="text-gray-700 whitespace-pre-wrap font-sans">
                {extractedContent}
              </pre>
            </div>
          </div>
        )}

        {/* Update Prompt Button */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            onClick={handleUpdatePrompt}
            disabled={isProcessing || (!extractedContent && !customContext)}
            className="bg-purple-600 hover:bg-purple-700 flex-1"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Brain className="h-4 w-4 mr-2" />
            )}
            {isProcessing ? "Updating AI..." : "Update AI Knowledge"}
          </Button>
          
          {(extractedContent || customContext) && (
            <Button
              onClick={resetUpload}
              variant="outline"
              className="border-gray-300"
            >
              Reset
            </Button>
          )}
        </div>

        {/* Status Indicator */}
        {isPromptUpdated && (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded border border-green-200">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              AI assistant knowledge updated successfully!
            </span>
          </div>
        )}

        {/* Supported Formats */}
        <div className="text-xs text-gray-500 bg-white p-2 rounded border">
          <strong>Supported formats:</strong> PDF, DOC, DOCX, TXT, MP4, AVI, MOV, MP3, WAV, JPG, PNG
        </div>
      </CardContent>
    </Card>
  );
} 