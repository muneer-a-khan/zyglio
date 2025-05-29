/**
 * Test Streaming Interview Page
 * Demonstrates the new real-time streaming interview system
 */

'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import StreamingInterview from '@/components/streaming-interview';
import { Loader2, Rocket } from 'lucide-react';

export default function TestStreamingPage() {
  const { data: session, status } = useSession();
  const [sessionId, setSessionId] = useState('');
  const [procedureTitle, setProcedureTitle] = useState('Surgical Wound Closure');
  const [initialContext, setInitialContext] = useState('A detailed procedure for properly closing surgical wounds using sutures, including preparation, technique, and post-closure care.');
  const [showDemo, setShowDemo] = useState(false);

  // Generate a demo session ID
  const generateSessionId = () => {
    const id = `streaming-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(id);
  };

  // Start the demo
  const startDemo = () => {
    if (!sessionId) {
      generateSessionId();
    }
    setShowDemo(true);
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">
              Please sign in to test the streaming interview system.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showDemo) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-4">
          <Button
            onClick={() => setShowDemo(false)}
            variant="outline"
            className="mb-4"
          >
            ← Back to Setup
          </Button>
        </div>
        <StreamingInterview
          sessionId={sessionId}
          procedureTitle={procedureTitle}
          initialContext={initialContext}
          onInterviewComplete={(response) => {
            console.log('Interview completed with response:', response);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-2">
            <Rocket className="w-8 h-8 text-blue-600" />
            Streaming Interview System Test
          </h1>
          <p className="text-lg text-gray-600">
            Test the new real-time OpenAI GPT-4o streaming agents with buffered transcript processing
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">Key Features</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Real-time transcript buffering (1-2 second chunks)</li>
                  <li>• OpenAI GPT-4o streaming agents</li>
                  <li>• Server-Sent Events for low latency</li>
                  <li>• Intelligent agent sequencing</li>
                  <li>• Shared context management</li>
                </ul>
              </div>
              
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">Active Agents</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Validation Agent (accuracy checking)</li>
                  <li>• Clarification Agent (gap identification)</li>
                  <li>• Follow-up Agent (question generation)</li>
                  <li>• Topic Analysis Agent (coverage tracking)</li>
                  <li>• Topic Discovery Agent (new topic detection)</li>
                </ul>
              </div>
            </div>
            
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-2">How it Works</h3>
              <p className="text-sm text-yellow-700">
                Speak into your microphone and watch as the system processes your speech in real-time. 
                Agents will analyze your input as you speak, providing validation feedback, clarifications, 
                and follow-up questions with minimal latency. The system buffers transcript chunks and 
                triggers agent processing based on sentence boundaries or word thresholds.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demo Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session ID
              </label>
              <div className="flex gap-2">
                <Input
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="Leave empty to auto-generate"
                  className="flex-1"
                />
                <Button onClick={generateSessionId} variant="outline">
                  Generate
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Procedure Title
              </label>
              <Input
                value={procedureTitle}
                onChange={(e) => setProcedureTitle(e.target.value)}
                placeholder="Enter procedure title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Initial Context
              </label>
              <Textarea
                value={initialContext}
                onChange={(e) => setInitialContext(e.target.value)}
                placeholder="Describe the procedure context"
                rows={3}
              />
            </div>

            <Button
              onClick={startDemo}
              size="lg"
              className="w-full flex items-center gap-2"
              disabled={!procedureTitle.trim() || !initialContext.trim()}
            >
              <Rocket className="w-5 h-5" />
              Start Streaming Interview Demo
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Technical Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600 space-y-2">
              <p>
                <strong>Browser Requirements:</strong> This demo requires a modern browser with 
                Web Speech API support (Chrome/Edge recommended).
              </p>
              <p>
                <strong>Microphone Access:</strong> You'll be prompted to allow microphone access 
                when you start recording.
              </p>
              <p>
                <strong>Network:</strong> The system uses Server-Sent Events for real-time communication. 
                Ensure stable internet connection for best experience.
              </p>
              <p>
                <strong>API Limits:</strong> This demo uses OpenAI GPT-4o which has rate limits. 
                If you encounter errors, wait a moment and try again.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 