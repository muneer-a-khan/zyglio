'use client';

import { CheckCircle, Circle, AlertCircle, Clock } from 'lucide-react';

interface TopicItem {
  id: string;
  name: string;
  category: string;
  status: 'not-discussed' | 'briefly-discussed' | 'thoroughly-covered';
  isRequired: boolean;
  keywords: string[];
  description?: string;
  coverageScore: number;
}

interface TopicChecklistProps {
  topics: TopicItem[];
  topicsByCategory: Record<string, TopicItem[]>;
  className?: string;
}

export default function TopicChecklist({ topics, topicsByCategory, className = '' }: TopicChecklistProps) {
  const getStatusIcon = (status: string, isRequired: boolean) => {
    switch (status) {
      case 'thoroughly-covered':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'briefly-discussed':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'not-discussed':
      default:
        return <Circle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'thoroughly-covered':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'briefly-discussed':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'not-discussed':
      default:
        return 'bg-red-50 border-red-200 text-red-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    // You can customize these icons based on category
    return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
  };

  const categories = Object.keys(topicsByCategory).sort();

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Topic Coverage
        </h2>
        <div className="mt-2 text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Circle className="w-4 h-4 text-red-500" />
              <span>Not discussed</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              <span>Briefly covered</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Thoroughly covered</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {categories.map((category) => (
          <div key={category} className="border-b border-gray-100 last:border-b-0">
            <div className="p-3 bg-gray-50">
              <h3 className="font-medium text-gray-900 text-sm flex items-center gap-2">
                {getCategoryIcon(category)}
                {category}
                <span className="text-xs text-gray-500">
                  ({topicsByCategory[category].length} topics)
                </span>
              </h3>
            </div>
            
            <div className="p-2 space-y-2">
              {topicsByCategory[category].map((topic) => (
                <div
                  key={topic.id}
                  className={`p-3 rounded-lg border transition-all duration-200 ${getStatusColor(topic.status)}`}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(topic.status, topic.isRequired)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-sm leading-tight">
                          {topic.name}
                          {topic.isRequired && (
                            <span className="ml-1 text-xs font-normal text-gray-600">
                              (Required)
                            </span>
                          )}
                        </h4>
                      </div>
                      
                      {topic.description && (
                        <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                          {topic.description}
                        </p>
                      )}
                      
                      {topic.keywords.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {topic.keywords.slice(0, 3).map((keyword, index) => (
                            <span
                              key={index}
                              className="inline-block px-2 py-1 text-xs bg-white bg-opacity-60 rounded-full"
                            >
                              {keyword}
                            </span>
                          ))}
                          {topic.keywords.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{topic.keywords.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                      
                      {topic.coverageScore > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-white bg-opacity-60 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  topic.coverageScore >= 70 
                                    ? 'bg-green-400' 
                                    : topic.coverageScore >= 30 
                                    ? 'bg-yellow-400' 
                                    : 'bg-red-400'
                                }`}
                                style={{ width: `${topic.coverageScore}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium">
                              {topic.coverageScore}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 