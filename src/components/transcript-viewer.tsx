"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Download, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ChatEvent {
  type: string;
  role?: string;
  messageText?: string;
  timestamp: string;
  emotionFeatures?: string;
}

interface TranscriptViewerProps {
  chatId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function TranscriptViewer({ chatId, isOpen, onClose }: TranscriptViewerProps) {
  const [transcript, setTranscript] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatEvents, setChatEvents] = useState<ChatEvent[]>([]);

  const fetchTranscript = async () => {
    if (!chatId) {
      toast.error("No chat ID available");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/hume/chat-events?chatId=${chatId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transcript');
      }

      // Filter for user and assistant messages
      const messageEvents = data.events.filter(
        (event: ChatEvent) => event.type === "USER_MESSAGE" || event.type === "AGENT_MESSAGE"
      );

      setChatEvents(messageEvents);

      // Generate transcript text
      const transcriptText = messageEvents
        .map((event: ChatEvent) => {
          const role = event.role === "USER" ? "User" : "Assistant";
          const timestamp = new Date(event.timestamp).toLocaleString();
          return `[${timestamp}] ${role}: ${event.messageText}`;
        })
        .join("\n\n");

      setTranscript(transcriptText);
      
      toast.success("Transcript loaded successfully!");
    } catch (error) {
      console.error('Error fetching transcript:', error);
      toast.error("Failed to load transcript");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTranscript = () => {
    if (!transcript) return;

    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_${chatId}_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Transcript downloaded!");
  };

  const formatEmotionName = (emotion: string) => {
    return emotion.charAt(0).toUpperCase() + emotion.slice(1).toLowerCase().replace(/_/g, ' ');
  };

  const getEmotionColor = (emotion: string) => {
    const emotionColors: { [key: string]: string } = {
      joy: "bg-yellow-100 text-yellow-800",
      sadness: "bg-blue-100 text-blue-800",
      anger: "bg-red-100 text-red-800",
      fear: "bg-purple-100 text-purple-800",
      surprise: "bg-green-100 text-green-800",
      disgust: "bg-orange-100 text-orange-800",
      confidence: "bg-emerald-100 text-emerald-800",
      anxiety: "bg-indigo-100 text-indigo-800",
    };
    return emotionColors[emotion.toLowerCase()] || "bg-gray-100 text-gray-800";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Full Conversation Transcript</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            {transcript && (
              <Button onClick={downloadTranscript} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
            <Button onClick={fetchTranscript} disabled={isLoading || !chatId} size="sm">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Load Transcript
                </>
              )}
            </Button>
            <Button onClick={onClose} variant="ghost" size="sm">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {!transcript && !isLoading && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Click "Load Transcript" to fetch the full conversation history.</p>
              {!chatId && (
                <p className="text-sm mt-2 text-red-500">
                  No chat ID available. Please start a conversation first.
                </p>
              )}
            </div>
          )}

          {transcript && (
            <ScrollArea className="h-[60vh]">
              <div className="space-y-4">
                {chatEvents.map((event, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg ${
                      event.role === "USER" 
                        ? "bg-blue-50 border-l-4 border-blue-500" 
                        : "bg-purple-50 border-l-4 border-purple-500"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`font-semibold ${
                          event.role === "USER" ? "text-blue-800" : "text-purple-800"
                        }`}>
                          {event.role === "USER" ? "You" : "AI Assistant"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-800 mb-2">{event.messageText}</p>
                    
                    {/* Display emotions for user messages if available */}
                    {event.role === "USER" && event.emotionFeatures && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(() => {
                          try {
                            const emotions = JSON.parse(event.emotionFeatures);
                            return Object.entries(emotions)
                              .sort(([,a], [,b]) => (b as number) - (a as number))
                              .slice(0, 3)
                              .map(([emotion, score], idx) => (
                                <span
                                  key={idx}
                                  className={`px-2 py-1 rounded-full text-xs ${getEmotionColor(emotion)}`}
                                >
                                  {formatEmotionName(emotion)} {((score as number) * 100).toFixed(0)}%
                                </span>
                              ));
                          } catch {
                            return null;
                          }
                        })()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 