'use client';

import { Bot, User } from 'lucide-react';

interface ConversationEntry {
  role: 'ai' | 'user';
  content: string;
  timestamp?: Date;
}

interface ConversationChatProps {
  conversationHistory: ConversationEntry[];
  currentQuestion?: string | null;
  className?: string;
}

export default function ConversationChat({ 
  conversationHistory, 
  currentQuestion, 
  className = '' 
}: ConversationChatProps) {
  const formatTime = (timestamp?: Date) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Bot className="w-5 h-5" />
          Interview Conversation
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Your responses and questions from this session
        </p>
      </div>

      <div className="max-h-96 overflow-y-auto p-4 space-y-4">
        {conversationHistory.length === 0 && !currentQuestion ? (
          <div className="text-center py-8 text-gray-500">
            <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Your conversation will appear here as you progress through the interview.</p>
          </div>
        ) : (
          <>
            {conversationHistory.map((entry, index) => (
              <div
                key={index}
                className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                    entry.role === 'user'
                      ? 'bg-blue-500 text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-900 rounded-bl-md'
                  }`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    {entry.role === 'ai' ? (
                      <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    ) : (
                      <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    )}
                    <span className="text-xs font-medium">
                      {entry.role === 'ai' ? 'AI Interviewer' : 'You'}
                    </span>
                  </div>
                  
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {entry.content}
                  </p>
                  
                  {entry.timestamp && (
                    <div className={`text-xs mt-2 opacity-70 ${
                      entry.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {formatTime(entry.timestamp)}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {currentQuestion && (
              <div className="flex justify-start">
                <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl bg-gray-100 text-gray-900 rounded-bl-md border-2 border-blue-200">
                  <div className="flex items-start gap-2 mb-2">
                    <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="text-xs font-medium">AI Interviewer</span>
                    <span className="text-xs text-blue-600 font-medium">Current</span>
                  </div>
                  
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {currentQuestion}
                  </p>
                  
                  <div className="text-xs mt-2 text-gray-500">
                    Just now
                  </div>
                  
                  <div className="mt-2 flex items-center gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {conversationHistory.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-600 text-center">
            {conversationHistory.length} messages exchanged
          </div>
        </div>
      )}
    </div>
  );
} 