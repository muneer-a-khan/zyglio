"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, PhoneOff, Loader2, Volume2, Heart, Brain, Upload } from "lucide-react";
import { toast } from "sonner";
import { VoiceProvider, useVoice, VoiceReadyState } from "@humeai/voice-react";
import MediaUploadPanel from "./media-upload-panel";

// Inner component that uses the useVoice hook
function VoiceChat() {
  const { connect, disconnect, readyState, messages } = useVoice();
  const [isConnecting, setIsConnecting] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentEmotions, setCurrentEmotions] = useState<Array<{emotion: string, score: number}>>([]);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [uploadedKnowledge, setUploadedKnowledge] = useState<string>("");

  // Your specific Hume config ID
  const configId = process.env.NEXT_PUBLIC_HUME_CONFIG_ID;

  // Extract emotions from latest message
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1] as any;
      
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
    console.log('🔌 Disconnecting from Hume EVI...');
    disconnect();
    setSessionStartTime(null);
    setCurrentEmotions([]);
    
    toast.info("Conversation Ended", {
      description: "Your voice interview session has ended.",
    });
  };

  const handlePromptUpdated = (newContent: string) => {
    setUploadedKnowledge(newContent);
    toast.success("AI Knowledge Updated", {
      description: "Your AI assistant's prompt has been enhanced with a new version!",
    });
  };

  // Test audio playback
  const testAudioPlayback = async () => {
    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 440;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      toast.success("Audio Test", {
        description: "If you heard a beep, audio playback is working!",
      });
    } catch (error) {
      console.error('Audio test failed:', error);
      toast.error("Audio Test Failed", {
        description: "Your browser may have audio restrictions.",
      });
    }
  };

  // Get emotion color based on emotion type
  const getEmotionColor = (emotion: string): string => {
    const emotionColors: Record<string, string> = {
      'joy': 'text-yellow-600 bg-yellow-100',
      'excitement': 'text-orange-600 bg-orange-100',
      'confidence': 'text-blue-600 bg-blue-100',
      'calmness': 'text-green-600 bg-green-100',
      'interest': 'text-purple-600 bg-purple-100',
      'curiosity': 'text-indigo-600 bg-indigo-100',
      'surprise': 'text-pink-600 bg-pink-100',
      'admiration': 'text-emerald-600 bg-emerald-100',
      'satisfaction': 'text-teal-600 bg-teal-100',
      'determination': 'text-red-600 bg-red-100',
      'concentration': 'text-gray-600 bg-gray-100',
      'contemplation': 'text-slate-600 bg-slate-100',
    };
    
    return emotionColors[emotion.toLowerCase()] || 'text-gray-600 bg-gray-100';
  };

  // Format emotion name for display
  const formatEmotionName = (emotion: string): string => {
    return emotion.charAt(0).toUpperCase() + emotion.slice(1).toLowerCase();
  };

  const isConnected = readyState === VoiceReadyState.OPEN;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-0 shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AI Voice Interview Demo
          </CardTitle>
          <p className="text-slate-600 mt-2">
            Experience Zyglio's advanced voice-to-mastery technology with emotional intelligence
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


          {/* Controls */}
          <div className="flex justify-center items-center space-x-4">
            {!isConnected ? (
              <div className="flex space-x-4">
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
              </div>
            ) : (
              <div className="flex space-x-4">
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
              <h4 className="font-semibold text-green-800 mb-2">🎉 Conversation Active</h4>
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
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main component with VoiceProvider
const HumeVoiceChat = () => {
  return (
    <VoiceProvider>
      <VoiceChat />
    </VoiceProvider>
  );
};

export default HumeVoiceChat; 