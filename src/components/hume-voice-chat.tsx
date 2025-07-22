"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, PhoneOff, Loader2, Mic, MicOff, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { VoiceProvider, useVoice, VoiceReadyState } from "@humeai/voice-react";

// Inner component that uses the useVoice hook
function VoiceChat() {
  const { connect, disconnect, readyState, messages } = useVoice();
  const [isConnecting, setIsConnecting] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Your specific Hume config ID
  const configId = process.env.NEXT_PUBLIC_HUME_CONFIG_ID;

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
          description: "Failed to authenticate with Hume AI. Please check your API keys.",
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
      
      console.log('🎉 Connected successfully to your specific Hume configuration!');
      setSessionStartTime(new Date());
      
      toast.success("Connected!", {
        description: `Connected to your custom Hume AI assistant configuration!`,
      });
    } catch (error) {
      console.error('💥 Connection failed:', error);
      toast.error("Connection Error", {
        description: "Failed to connect to Hume AI. Please try again.",
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
    
    toast.info("Conversation Ended", {
      description: "Your voice interview session has ended.",
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

  const isConnected = readyState === VoiceReadyState.OPEN;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-0 shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Hume AI Voice Interview Demo
          </CardTitle>
          <p className="text-slate-600 mt-2">
            Experience Zyglio's advanced voice-to-mastery technology with your custom Hume AI configuration
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

          {/* Controls */}
          <div className="flex justify-center items-center space-x-4">
            {!isConnected ? (
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
                  onClick={handleDisconnect}
                  className="px-12 py-4 rounded-full font-semibold text-lg transition-all duration-300 bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl"
                >
                  <PhoneOff className="mr-3 h-6 w-6" />
                  End Conversation
                </Button>
              </div>
            )}
          </div>

          {/* Session Info */}
          {isConnected && sessionStartTime && (
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">🎉 Conversation Active</h4>
              <p className="text-sm text-green-700 mb-2">
                Your voice interview session with your custom Hume AI assistant is now active! 
                The AI is using your specific prompt and configuration.
              </p>
              <p className="text-xs text-green-600">
                Session started at: {sessionStartTime.toLocaleTimeString()}
              </p>
            </div>
          )}

          {/* Recent Messages */}
          {messages.length > 0 && (
            <div className="bg-white rounded-lg p-4 border border-gray-200 max-h-48 overflow-y-auto">
              <h4 className="font-semibold text-gray-800 mb-2">Conversation History</h4>
              <div className="space-y-2">
                {messages.slice(-5).map((msg, index) => {
                  try {
                    return (
                      <div key={index} className="text-sm">
                        {msg.type === "user_message" && (
                          <div className="bg-blue-50 p-2 rounded mb-2">
                            <span className="font-medium text-blue-800">You:</span> {msg.message.content}
                          </div>
                        )}
                        {msg.type === "assistant_message" && (
                          <div className="bg-purple-50 p-2 rounded mb-2">
                            <span className="font-medium text-purple-800">AI:</span> {msg.message.content}
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

          {/* Demo Instructions */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">How to use this demo:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Click "Start Voice Conversation" to connect to your custom Hume AI assistant</li>
              <li>• Allow microphone access when prompted</li>
              <li>• Speak naturally - Your AI will respond using your custom prompt and configuration</li>
              <li>• The AI will respond with voice and show emotional understanding</li>
              <li>• Use the "Test Audio" button to verify audio playback works</li>
              <li>• Click "End Conversation" when finished</li>
            </ul>
          </div>

          {/* Technology Info */}
          <div className="bg-purple-50 rounded-lg p-4">
            <h4 className="font-semibold text-purple-800 mb-2">🧠 Powered by Your Custom Hume AI Configuration</h4>
            <p className="text-sm text-purple-600 mt-2">
              This demo connects to your specific Hume AI configuration ({configId}) with your custom prompt and settings.
              Experience real-time voice conversations with emotional intelligence tailored to your needs.
            </p>
            <p className="text-xs text-purple-500 mt-2">
              Features: Your custom prompt, real-time emotion recognition, natural turn-taking, and voice-to-voice interaction.
            </p>
          </div>

          {/* Debug Info (Development Only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-100 rounded-lg p-3 text-xs text-gray-600">
              <div className="font-semibold mb-1">Debug Info:</div>
              <div>Ready State: {readyState}</div>
              <div>Connected: {isConnected.toString()}</div>
              <div>Connecting: {isConnecting.toString()}</div>
              <div>Messages: {messages.length}</div>
              <div>Session Start: {sessionStartTime?.toLocaleTimeString() || 'null'}</div>
              <div>Access Token: {accessToken ? 'Set' : 'Missing'}</div>
              <div>Config ID: {configId || 'Missing'}</div>
              <div>Last 3 Message Types: {messages.slice(-3).map(m => m.type).join(', ')}</div>
            </div>
          )}
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