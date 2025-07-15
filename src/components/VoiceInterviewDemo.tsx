"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, PhoneOff, Loader2, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { useConversation } from '@elevenlabs/react';

const VoiceInterviewDemo = () => {
  const [isInCall, setIsInCall] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [agentStatus, setAgentStatus] = useState<'listening' | 'speaking' | 'idle'>('idle');
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  // ElevenLabs Agent ID
  const AGENT_ID = "agent_01k011w3b9epzb3eg4vjqjfn8v";

  // Initialize voice conversation SDK
  const conversationSdk = useConversation({
    onConnect: () => {
      console.log('🎉 Successfully connected to ElevenLabs voice conversation');
      setIsSessionActive(true);
      setIsInCall(true);
      setIsConnecting(false);
      setAgentStatus('listening');
      setSessionStartTime(new Date());
      
      toast.success("Connected!", {
        description: "Connected to your AI interview assistant!",
      });
    },
    onDisconnect: () => {
      console.log('🔌 Disconnected from ElevenLabs voice conversation');
      setIsSessionActive(false);
      setIsInCall(false);
      setAgentStatus('idle');
      setSessionStartTime(null);
      
      toast.info("Conversation Ended", {
        description: "Your voice interview session has ended.",
      });
    },
    onMessage: (message: any) => {
      console.log('🤖 Agent message received:', message);
      
      if (message.type === 'agent_response') {
        setAgentStatus('listening');
      } else if (message.type === 'user_transcript') {
        setAgentStatus('speaking');
      }
    },
    onError: (error: any) => {
      console.error('❌ ElevenLabs connection error:', error);
      setIsSessionActive(false);
      setIsInCall(false);
      setIsConnecting(false);
      setAgentStatus('idle');
      
      toast.error("Connection Error", {
        description: `Connection error: ${error.message}`,
      });
    },
    onModeChange: (mode: { mode: string }) => {
      console.log('🔄 Mode changed to:', mode.mode);
      setAgentStatus(mode.mode === 'speaking' ? 'speaking' : 'listening');
    }
  });

  const startCall = useCallback(async () => {
    console.log('🎬 Starting voice interview demo...');
    setIsConnecting(true);
    
    try {
      // Request microphone permission
      console.log('🎤 Requesting microphone permission...');
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone permission granted');
      
      // Start conversation with agent
      console.log('🚀 Starting ElevenLabs session with agent:', AGENT_ID);
      await conversationSdk.startSession({
        agentId: AGENT_ID
      });
      
      console.log('🎉 ElevenLabs session started successfully!');
      
      toast.success("Conversation Started", {
        description: "Your voice interview session is now active!",
      });
      
    } catch (error) {
      console.error('💥 Failed to start interview:', error);
      setIsConnecting(false);
      setIsInCall(false);
      setIsSessionActive(false);
      
      toast.error("Connection Error", {
        description: "Failed to start interview. Please check microphone permissions.",
      });
    }
  }, [conversationSdk, AGENT_ID]);

  const endCall = useCallback(async () => {
    console.log('🛑 Attempting to end conversation...');
    console.log('Session state - isSessionActive:', isSessionActive, 'isInCall:', isInCall);
    
    try {
      console.log('📞 Calling conversationSdk.endSession()...');
      await conversationSdk.endSession();
      console.log('✅ ElevenLabs conversation session ended successfully');
      
      // Update local state
      setIsInCall(false);
      setIsSessionActive(false);
      setAgentStatus('idle');
      setSessionStartTime(null);
      
      toast.info("Conversation Ended", {
        description: "Your voice interview session has ended.",
      });
      
    } catch (error) {
      console.error('💥 Error ending conversation session:', error);
      
      // Force update the UI even if there's an error ending the session
      setIsInCall(false);
      setIsSessionActive(false);
      setAgentStatus('idle');
      setSessionStartTime(null);
      
      toast.error("Error ending session", {
        description: "There was an issue ending the conversation properly, but the UI has been reset.",
      });
    }
  }, [conversationSdk, isSessionActive, isInCall]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-0 shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Live Voice Interview Demo
          </CardTitle>
          <p className="text-slate-600 mt-2">
            Experience Zyglio's voice-to-mastery technology with our advanced AI voice assistant
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Call Status */}
          <div className="flex items-center justify-center space-x-4 p-4 bg-white/50 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isInCall ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm font-medium">
                {isInCall ? 'Conversation Active' : 'Ready to Start'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnecting ? 'bg-yellow-500 animate-pulse' : isSessionActive ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm font-medium">
                {isConnecting ? 'Connecting...' : isSessionActive ? 'Session Active' : 'Idle'}
              </span>
            </div>
            {agentStatus !== 'idle' && (
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${agentStatus === 'speaking' ? 'bg-purple-500 animate-pulse' : 'bg-green-500'}`}></div>
                <span className="text-sm font-medium capitalize">
                  {agentStatus}
                </span>
              </div>
            )}
          </div>

          {/* Call Controls */}
          <div className="flex justify-center">
            {!isInCall ? (
              <Button
                onClick={startCall}
                disabled={isConnecting}
                className="px-12 py-4 rounded-full font-semibold text-lg transition-all duration-300 bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Phone className="mr-3 h-6 w-6" />
                    Start Voice Conversation
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={endCall}
                className="px-12 py-4 rounded-full font-semibold text-lg transition-all duration-300 bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl"
              >
                <PhoneOff className="mr-3 h-6 w-6" />
                End Conversation
              </Button>
            )}
          </div>

          {/* Session Debug Info (only show in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-100 rounded-lg p-3 text-xs text-gray-600">
              <div>Debug Info:</div>
              <div>isInCall: {isInCall.toString()}</div>
              <div>isSessionActive: {isSessionActive.toString()}</div>
              <div>isConnecting: {isConnecting.toString()}</div>
              <div>agentStatus: {agentStatus}</div>
              <div>sessionStartTime: {sessionStartTime?.toLocaleTimeString() || 'null'}</div>
            </div>
          )}

          {/* Conversation Status */}
          {isInCall && (
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">Conversation Active</h4>
              <p className="text-sm text-green-700 mb-3">
                Your voice interview session is now active! Speak naturally with your AI assistant.
              </p>
              {sessionStartTime && (
                <p className="text-xs text-green-600">
                  Session started at: {sessionStartTime.toLocaleTimeString()}
                </p>
              )}
            </div>
          )}

          {/* Demo Instructions */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">How to use this demo:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Click "Start Voice Conversation" to begin your interview session</li>
              <li>• Allow microphone access when prompted</li>
              <li>• Speak naturally with your AI interview assistant</li>
              <li>• The AI will respond in real-time using our advanced voice technology</li>
              <li>• Click "End Conversation" when finished</li>
            </ul>
          </div>

          {/* Technology Info */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
            <h4 className="font-semibold text-purple-800 mb-2">Powered by Zyglio Voice Technology</h4>
            <p className="text-sm text-purple-600 mt-2">
              Experience real-time voice conversations with your AI interview assistant using our
              advanced voice-to-mastery technology. Features include speech-to-text, language model integration,
              and natural turn-taking for professional interview practice.
            </p>
            <p className="text-xs text-purple-500 mt-2">
              The conversation happens directly on this page using our embedded voice technology.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceInterviewDemo; 