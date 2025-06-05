"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Play, Mic } from 'lucide-react';

interface ApiTestResult {
  endpoint: string;
  method: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  response?: any;
  error?: string;
  duration?: number;
}

export default function ApiTestPage() {
  const [tests, setTests] = useState<ApiTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTest = (endpoint: string, method: string, update: Partial<ApiTestResult>) => {
    setTests(prev => {
      const existing = prev.find(t => t.endpoint === endpoint && t.method === method);
      if (existing) {
        return prev.map(t => 
          t.endpoint === endpoint && t.method === method 
            ? { ...t, ...update }
            : t
        );
      } else {
        return [...prev, { endpoint, method, status: 'idle', ...update }];
      }
    });
  };

  const runTest = async (
    endpoint: string, 
    method: string, 
    body?: any, 
    contentType = 'application/json'
  ) => {
    const startTime = Date.now();
    updateTest(endpoint, method, { status: 'loading' });

    try {
      const options: RequestInit = {
        method,
        headers: contentType === 'application/json' ? {
          'Content-Type': 'application/json'
        } : {}
      };

      if (body && method !== 'GET') {
        if (contentType === 'application/json') {
          options.body = JSON.stringify(body);
        } else {
          options.body = body;
        }
      }

      const response = await fetch(endpoint, options);
      const duration = Date.now() - startTime;
      
      let responseData;
      const contentTypeHeader = response.headers.get('content-type');
      
      if (contentTypeHeader?.includes('application/json')) {
        responseData = await response.json();
      } else if (contentTypeHeader?.includes('audio/')) {
        responseData = { 
          type: 'audio', 
          size: response.headers.get('content-length'),
          contentType: contentTypeHeader
        };
      } else {
        responseData = await response.text();
      }

      if (response.ok) {
        updateTest(endpoint, method, { 
          status: 'success', 
          response: responseData, 
          duration 
        });
      } else {
        updateTest(endpoint, method, { 
          status: 'error', 
          error: `${response.status}: ${JSON.stringify(responseData)}`, 
          duration 
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTest(endpoint, method, { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error', 
        duration 
      });
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTests([]);

    const testCases = [
      // Task API Tests
      { endpoint: '/api/tasks', method: 'GET' },
      { 
        endpoint: '/api/tasks', 
        method: 'POST', 
        body: {
          title: 'Test Learning Task',
          description: 'A test task created via API',
          objectives: ['Learn API testing', 'Understand system integration'],
          difficulty: 'Medium',
          estimatedTime: 30
        }
      },

      // AI Enhancement Tests
      { endpoint: '/api/ai/enhance', method: 'GET' },
      {
        endpoint: '/api/ai/enhance',
        method: 'POST',
        body: {
          type: 'content',
          contentType: 'instruction',
          context: 'How to properly operate a laboratory centrifuge',
          tone: 'instructional'
        }
      },

      // Voice API Tests
      { endpoint: '/api/voice/transcribe', method: 'GET' },
      { endpoint: '/api/voice/tts', method: 'GET' },
      {
        endpoint: '/api/voice/tts',
        method: 'POST',
        body: {
          text: 'Hello! This is a test of the text-to-speech system.',
          stability: 0.5,
          similarityBoost: 0.5
        }
      }
    ];

    for (const testCase of testCases) {
      await runTest(testCase.endpoint, testCase.method, testCase.body);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: ApiTestResult['status']) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 rounded-full bg-gray-300" />;
    }
  };

  const getStatusColor = (status: ApiTestResult['status']) => {
    switch (status) {
      case 'loading':
        return 'bg-blue-100 text-blue-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            API Integration Test Suite
          </h1>
          <p className="text-gray-600">
            Test all API endpoints to verify the integration is working correctly
          </p>
        </div>

        {/* Control Panel */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-center">
              <Button 
                onClick={runAllTests}
                disabled={isRunning}
                className="flex items-center gap-2"
              >
                {isRunning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {isRunning ? 'Running Tests...' : 'Run All Tests'}
              </Button>

              <div className="text-sm text-gray-600">
                Tests: {tests.filter(t => t.status === 'success').length} passed, 
                {' '}{tests.filter(t => t.status === 'error').length} failed,
                {' '}{tests.filter(t => t.status === 'loading').length} running
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        <div className="space-y-4">
          {tests.map((test, index) => (
            <Card key={`${test.endpoint}-${test.method}-${index}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(test.status)}
                    <div>
                      <h3 className="font-semibold">
                        {test.method} {test.endpoint}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{test.method}</Badge>
                        <Badge className={getStatusColor(test.status)}>
                          {test.status}
                        </Badge>
                        {test.duration && (
                          <Badge variant="outline">{test.duration}ms</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              {(test.response || test.error) && (
                <CardContent>
                  {test.status === 'error' && test.error && (
                    <Alert className="mb-4">
                      <AlertDescription className="text-red-700">
                        {test.error}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {test.response && (
                    <div>
                      <h4 className="font-medium mb-2">Response:</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                        {typeof test.response === 'object' 
                          ? JSON.stringify(test.response, null, 2)
                          : test.response
                        }
                      </pre>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {tests.length === 0 && !isRunning && (
          <Card>
            <CardContent className="text-center py-12">
              <Mic className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Ready to Test APIs
              </h3>
              <p className="text-gray-600 mb-4">
                Click "Run All Tests" to verify that all API endpoints are working correctly
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 