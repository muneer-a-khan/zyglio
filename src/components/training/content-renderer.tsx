'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  CheckCircle, 
  AlertTriangle,
  Lightbulb,
  Clock,
  Play
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { EmbeddedQuiz } from './interactive/embedded-quiz';
import { DragDropExercise } from './interactive/drag-drop-exercise';
import { ScenarioSimulation } from './interactive/scenario-simulation';

interface ContentRendererProps {
  content: {
    id: string;
    subtopic: string;
    contentType: string;
    title: string;
    content: any;
    estimatedTime: number;
  };
}

export function ContentRenderer({ content }: ContentRendererProps) {
  const [currentTab, setCurrentTab] = useState('article');

  const renderArticleContent = () => {
    if (content.contentType !== 'ARTICLE') return null;

    const articleData = content.content;

    return (
      <div className="space-y-6">
        {/* Article Header */}
        <div className="border-b pb-4">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {content.estimatedTime} min read
            </Badge>
            <Badge variant="secondary">
              {content.subtopic}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold">{content.title}</h1>
        </div>

        {/* Key Points */}
        {articleData.keyPoints && articleData.keyPoints.length > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-blue-900">
                <Lightbulb className="w-5 h-5" />
                Key Learning Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {articleData.keyPoints.map((point: string, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-blue-800">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Safety Notes */}
        {articleData.safetyNotes && articleData.safetyNotes.length > 0 && (
          <Card className="bg-orange-50 border-orange-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-orange-900">
                <AlertTriangle className="w-5 h-5" />
                Safety Considerations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {articleData.safetyNotes.map((note: string, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-orange-800">
                    <AlertTriangle className="w-4 h-4 mt-0.5 text-orange-600 flex-shrink-0" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Main Article Content */}
        <Card>
          <CardContent className="pt-6">
            <div className="prose max-w-none">
              <ReactMarkdown 
                className="text-gray-800 leading-relaxed"
                components={{
                  h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 text-gray-900">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 mt-6 text-gray-900">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-lg font-medium mb-2 mt-4 text-gray-900">{children}</h3>,
                  p: ({ children }) => <p className="mb-4 text-gray-800 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="mb-4 ml-6 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="mb-4 ml-6 space-y-1 list-decimal">{children}</ol>,
                  li: ({ children }) => <li className="text-gray-800">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                  em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-blue-300 pl-4 py-2 my-4 bg-blue-50 italic text-blue-800">
                      {children}
                    </blockquote>
                  ),
                  code: ({ children }) => (
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-4">
                      {children}
                    </pre>
                  )
                }}
              >
                {articleData.content}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>

        {/* Embedded Interactive Elements */}
        {articleData.embeddedQuiz && (
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-900">
                <CheckCircle className="w-5 h-5" />
                Quick Knowledge Check
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EmbeddedQuiz 
                questions={articleData.embeddedQuiz}
                onComplete={(score) => console.log('Embedded quiz score:', score)}
              />
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderInteractiveContent = () => {
    switch (content.contentType) {
      case 'INTERACTIVE_QUIZ':
        return (
          <EmbeddedQuiz 
            questions={content.content.questions}
            onComplete={(score) => console.log('Interactive quiz score:', score)}
          />
        );
      
      case 'DRAG_DROP':
        return (
          <DragDropExercise 
            exercise={content.content}
            onComplete={(result) => console.log('Drag-drop result:', result)}
          />
        );
      
      case 'SCENARIO_SIMULATION':
        return (
          <ScenarioSimulation 
            scenario={content.content}
            onComplete={(result) => console.log('Scenario result:', result)}
          />
        );
      
      case 'VIDEO_CONTENT':
        return (
          <Card>
            <CardContent className="pt-6">
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Play className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Video content coming soon</p>
                </div>
              </div>
              {content.content.description && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2">{content.content.title}</h3>
                  <p className="text-gray-600">{content.content.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      
      default:
        return renderArticleContent();
    }
  };

  return (
    <div className="space-y-6">
      {content.contentType === 'ARTICLE' ? (
        renderArticleContent()
      ) : (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">{content.title}</h1>
              <p className="text-gray-600 mt-1">
                Interactive content • {content.estimatedTime} minutes
              </p>
            </div>
            <Badge variant="secondary">{content.subtopic}</Badge>
          </div>
          
          {renderInteractiveContent()}
        </div>
      )}
    </div>
  );
} 