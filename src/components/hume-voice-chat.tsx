"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, PhoneOff, Loader2, Volume2, Heart, Brain, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { VoiceProvider, useVoice, VoiceReadyState } from "@humeai/voice-react";
import MediaUploadPanel from "./media-upload-panel";
import TranscriptViewer from "./transcript-viewer";

// Inner component that uses the useVoice hook
function VoiceChat() {
  const { connect, disconnect, readyState, messages } = useVoice();
  const [isConnecting, setIsConnecting] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentEmotions, setCurrentEmotions] = useState<Array<{emotion: string, score: number}>>([]);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [uploadedKnowledge, setUploadedKnowledge] = useState<string>("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [showTranscriptViewer, setShowTranscriptViewer] = useState(false);

  // Your specific Hume config ID
  const configId = process.env.NEXT_PUBLIC_HUME_CONFIG_ID;

  // Extract emotions from latest message and capture chat metadata
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1] as any;
      
      // Capture chat_id from chat_metadata message
      if (latestMessage?.type === 'chat_metadata' && latestMessage?.chat_id) {
        setChatId(latestMessage.chat_id);
        console.log('🆔 Chat ID captured:', latestMessage.chat_id);
      }
      
      // Check for emotion data in various possible locations with type safety
      const emotionScores = latestMessage?.models?.prosody?.scores || 
                           latestMessage?.prosody?.scores || 
                           latestMessage?.emotion?.scores;
      
      if (emotionScores && typeof emotionScores === 'object') {
        const emotions = Object.entries(emotionScores)
          .map(([emotion, score]) => ({ emotion, score: score as number }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 5); // Top 5 emotions
        
        setCurrentEmotions(emotions);
      }
    }
  }, [messages]);

  // Fetch access token on component mount
  useEffect(() => {
    const fetchToken = async () => {
      try {
        console.log('🔑 Fetching access token...');
        const response = await fetch('/api/hume/auth');
        const data = await response.json();
        
        if (data.accessToken) {
          setAccessToken(data.accessToken);
          console.log('✅ Access token received');
        } else {
          throw new Error(data.error || 'Failed to get access token');
        }
      } catch (error) {
        console.error('❌ Error fetching access token:', error);
        toast.error("Authentication Error", {
          description: "Failed to authenticate with our AI. Please check your API keys.",
        });
      }
    };

    fetchToken();
  }, []);

  // Handle connection
  const handleConnect = async () => {
    if (!accessToken) {
      toast.error("No Access Token", {
        description: "Please wait for authentication to complete.",
      });
      return;
    }

    if (!configId) {
      toast.error("Configuration Error", {
        description: "Hume config ID not found. Please check your environment variables.",
      });
      return;
    }

    setIsConnecting(true);
    console.log('🎯 Connecting to Hume EVI with config ID:', configId);

    try {
      await connect({
        auth: { 
          type: "accessToken", 
          value: accessToken 
        },
        configId: configId // Use your specific config ID
      });
      
      console.log('🎉 Connected successfully to your specific configuration!');
      setSessionStartTime(new Date());
      
      toast.success("Connected!", {
        description: `Connected to your custom AI assistant configuration!`,
      });
    } catch (error) {
      console.error('💥 Connection failed:', error);
      toast.error("Connection Error", {
        description: "Failed to connect to our AI. Please try again.",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle disconnect
  const handleDisconnect = () => {
    disconnect();
    setSessionStartTime(null);
    setChatId(null); // Reset chat ID when disconnecting
    
    toast.info("Disconnected", {
      description: "Voice conversation ended.",
    });
  };

  // Helper function to format emotion names
  const formatEmotionName = (emotion: string) => {
    return emotion.charAt(0).toUpperCase() + emotion.slice(1).toLowerCase().replace(/_/g, ' ');
  };

  // Helper function to get emotion colors
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

  // Test audio playback function
  const testAudioPlayback = async () => {
    try {
      // Create a simple audio test
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 440; // A note
      gainNode.gain.value = 0.1;
      
      oscillator.start();
      setTimeout(() => oscillator.stop(), 500);
      
      toast.success("Audio Test", {
        description: "If you heard a tone, your audio is working correctly!",
      });
    } catch (error) {
      toast.error("Audio Test Failed", {
        description: "There might be an issue with your audio setup.",
      });
    }
  };

  const handlePromptUpdated = (extractedContent: string) => {
    setUploadedKnowledge(extractedContent);
    setShowUploadPanel(false);
    toast.success("Knowledge Updated!", {
      description: "Your AI assistant now has access to the uploaded content.",
    });
  };

  const isConnected = readyState === VoiceReadyState.OPEN;

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="shadow-2xl border-0 bg-gradient-to-br from-white to-blue-50">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            🎤 Voice Interview Demo
          </CardTitle>
          <p className="text-lg text-gray-600 mt-2">
            Experience emotionally intelligent AI conversation
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-center space-x-4 p-4 bg-white/50 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm font-medium">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                isConnecting ? 'bg-yellow-500 animate-pulse' : 
                isConnected ? 'bg-blue-500' : 'bg-gray-400'
              }`}></div>
              <span className="text-sm font-medium">
                {isConnecting ? 'Connecting...' : 
                 isConnected ? 'Session Active' : 'Idle'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${accessToken ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium">
                {accessToken ? 'Authenticated' : 'Not Authenticated'}
              </span>
            </div>
          </div>

          {/* Emotion Display */}
          {currentEmotions.length > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
              <h4 className="font-semibold text-purple-800 mb-3 flex items-center">
                <Heart className="mr-2 h-5 w-5" />
                Detected Emotions
              </h4>
              <div className="flex flex-wrap gap-2">
                {currentEmotions.map((emotion, index) => (
                  <span 
                    key={index}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getEmotionColor(emotion.emotion)}`}
                  >
                    {formatEmotionName(emotion.emotion)} {(emotion.score * 100).toFixed(0)}%
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center items-center space-x-4">
            {!isConnected ? (
              <div className="flex flex-wrap justify-center gap-4">
                <Button
                  onClick={handleConnect}
                  disabled={isConnecting || !accessToken}
                  className="px-12 py-4 rounded-full font-semibold text-lg transition-all duration-300 bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                      Connecting to Your Assistant...
                    </>
                  ) : !accessToken ? (
                    <>
                      <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <Phone className="mr-3 h-6 w-6" />
                      Start Voice Conversation
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={() => setShowUploadPanel(!showUploadPanel)}
                  variant="outline"
                  className="px-6 py-3 rounded-full border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <Upload className="mr-2 h-5 w-5" />
                  {showUploadPanel ? "Hide" : "Upload"} Knowledge
                </Button>

                {chatId && (
                  <Button
                    onClick={() => setShowTranscriptViewer(true)}
                    variant="outline"
                    className="px-6 py-3 rounded-full border-purple-300 text-purple-700 hover:bg-purple-50"
                  >
                    <FileText className="mr-2 h-5 w-5" />
                    View Full Transcript
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-4">
                <Button
                  onClick={testAudioPlayback}
                  variant="outline"
                  className="px-6 py-3 rounded-full"
                >
                  <Volume2 className="mr-2 h-5 w-5" />
                  Test Audio
                </Button>
                
                <Button
                  onClick={() => setShowUploadPanel(!showUploadPanel)}
                  variant="outline"
                  className="px-6 py-3 rounded-full border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <Upload className="mr-2 h-5 w-5" />
                  {showUploadPanel ? "Hide" : "Upload"} Knowledge
                </Button>

                {chatId && (
                  <Button
                    onClick={() => setShowTranscriptViewer(true)}
                    variant="outline"
                    className="px-6 py-3 rounded-full border-purple-300 text-purple-700 hover:bg-purple-50"
                  >
                    <FileText className="mr-2 h-5 w-5" />
                    View Full Transcript
                  </Button>
                )}
                
                <Button
                  onClick={handleDisconnect}
                  className="px-12 py-4 rounded-full font-semibold text-lg transition-all duration-300 bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl"
                >
                  <PhoneOff className="mr-3 h-6 w-6" />
                  End Conversation
                </Button>
              </div>
            )}
          </div>

          {/* Media Upload Panel */}
          {showUploadPanel && (
            <div className="mt-6">
              <MediaUploadPanel onPromptUpdated={handlePromptUpdated} />
            </div>
          )}

          {/* Session Info */}
          {isConnected && sessionStartTime && (
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2 flex items-center">
                🎉 Conversation Active
                {chatId && (
                  <span className="ml-2 text-xs bg-green-200 text-green-700 px-2 py-1 rounded">
                    ID: {chatId.slice(0, 8)}...
                  </span>
                )}
              </h4>
              <p className="text-sm text-green-700 mb-2">
                Your voice interview session with your custom AI assistant is now active! 
                The AI is analyzing your emotions in real-time and responding with emotional intelligence.
              </p>
              <p className="text-xs text-green-600">
                Session started at: {sessionStartTime.toLocaleTimeString()}
              </p>
            </div>
          )}

          {/* Recent Messages */}
          {messages.length > 0 && (
            <div className="bg-white rounded-lg p-4 border border-gray-200 max-h-64 overflow-y-auto">
              <h4 className="font-semibold text-gray-800 mb-2">Conversation History</h4>
              <div className="space-y-3">
                {messages.slice(-5).map((msg, index) => {
                  try {
                    return (
                      <div key={index} className="text-sm">
                        {msg.type === "user_message" && (
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <span className="font-medium text-blue-800">You:</span> 
                                <span className="ml-2">{msg.message.content}</span>
                              </div>
                            </div>
                            
                            {/* Display emotions for user messages if available */}
                            {(() => {
                              const msgData = msg as any;
                              const emotionScores = msgData?.models?.prosody?.scores || 
                                                   msgData?.prosody?.scores || 
                                                   msgData?.emotion?.scores;
                              
                              if (emotionScores && typeof emotionScores === 'object') {
                                return (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {Object.entries(emotionScores)
                                      .sort(([,a], [,b]) => (b as number) - (a as number))
                                      .slice(0, 3)
                                      .map(([emotion, score], idx) => (
                                        <span 
                                          key={idx}
                                          className={`px-2 py-1 rounded-full text-xs ${getEmotionColor(emotion)}`}
                                        >
                                          {formatEmotionName(emotion)} {((score as number) * 100).toFixed(0)}%
                                        </span>
                                      ))}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}
                        {msg.type === "assistant_message" && (
                          <div className="bg-purple-50 p-3 rounded-lg">
                            <span className="font-medium text-purple-800">AI:</span> 
                            <span className="ml-2">{msg.message.content}</span>
                          </div>
                        )}
                      </div>
                    );
                  } catch (error) {
                    console.error('Error rendering message:', error, msg);
                    return (
                      <div key={index} className="text-sm bg-red-50 p-2 rounded mb-2">
                        <span className="font-medium text-red-800">Error:</span> Failed to display message
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          )}

          {/* Demo Instructions and Features */}
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-blue-800 mb-2">How to use this demo:</h4>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Connect your microphone and allow browser access.</li>
              <li>Speak naturally to the AI assistant.</li>
              <li>Click End or Stop when finished.</li>
              <li>(Optional) Upload any multimedia content (documents, images, videos, etc.) you want the AI to have knowledge of for more personalized responses.</li>
              <li>Click "View Full Transcript" to see the complete conversation history with emotion analysis.</li>
            </ul>
          </div>
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <h4 className="font-semibold text-blue-800 mb-2">Features</h4>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Real-time voice-to-voice AI conversation</li>
              <li>Emotionally intelligent and empathetic responses</li>
              <li>Live emotion analysis as you speak</li>
              <li>Support for uploading custom multimedia knowledge</li>
              <li>Instant, natural language understanding</li>
              <li>Personalized, context-aware interactions</li>
              <li>Full conversation transcript with emotion analysis</li>
              <li>Download conversation transcripts for review</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Transcript Viewer Modal */}
      <TranscriptViewer 
        chatId={chatId}
        isOpen={showTranscriptViewer}
        onClose={() => setShowTranscriptViewer(false)}
      />
    </div>
  );
}

// Main component with VoiceProvider
export default function HumeVoiceChat() {
  return (
    <VoiceProvider>
      <VoiceChat />
    </VoiceProvider>
  );
} 