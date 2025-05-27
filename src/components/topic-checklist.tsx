'use client';

import { CheckCircle, Circle, AlertCircle, Clock, ChevronDown, ChevronRight, Tag } from 'lucide-react';
import { useState } from 'react';

interface TopicItem {
  id: string;
  name: string;
  category: string;
  status: 'not-discussed' | 'briefly-discussed' | 'thoroughly-covered';
  isRequired: boolean;
  keywords: string[];
  description?: string;
  coverageScore: number;
  subtopics?: TopicItem[]; // Add subtopics property
}

interface TopicChecklistProps {
  topics: TopicItem[];
  topicsByCategory: Record<string, TopicItem[]>;
  className?: string;
}

export default function TopicChecklist({ topics, topicsByCategory, className = '' }: TopicChecklistProps) {
  // State to track which categories are expanded
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    Object.keys(topicsByCategory).forEach(category => {
      initial[category] = true; // Default to expanded
    });
    return initial;
  });

  // State to track which topics have expanded subtopics
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  
  // State to track which topics have expanded tags
  const [expandedTags, setExpandedTags] = useState<Record<string, boolean>>({});

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const toggleTopic = (topicId: string) => {
    setExpandedTopics(prev => ({
      ...prev,
      [topicId]: !prev[topicId]
    }));
  };
  
  const toggleTags = (topicId: string) => {
    setExpandedTags(prev => ({
      ...prev,
      [topicId]: !prev[topicId]
    }));
  };

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
        return 'bg-green-50 border-green-200 text-green-800 border-l-4 border-l-green-500';
      case 'briefly-discussed':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800 border-l-4 border-l-yellow-500';
      case 'not-discussed':
      default:
        return 'bg-red-50 border-red-200 text-red-800 border-l-4 border-l-red-500';
    }
  };

  const getCategoryIcon = (category: string) => {
    // You can customize these icons based on category
    return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
  };

  const categories = Object.keys(topicsByCategory).sort();

  // Function to determine if a topic has subtopics
  const hasSubtopics = (topic: TopicItem) => {
    return topic.subtopics && topic.subtopics.length > 0;
  };
  
  // Function to determine if a topic has keywords/tags
  const hasTags = (topic: TopicItem) => {
    return topic.keywords && topic.keywords.length > 0;
  };

  // Group topics by parent/child relationship if not already done
  const organizeTopicHierarchy = (topicsInCategory: TopicItem[]) => {
    // Implementation would depend on how your data is structured
    // This is a simple example that assumes subtopics are already defined
    return topicsInCategory;
  };

  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 min-w-[320px] w-full ${className}`}>
      <div className="p-4 border-b border-gray-200 bg-blue-50">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Topic Coverage Checklist
        </h2>
        <div className="mt-2 text-sm text-gray-600">
          <div className="flex items-center gap-4 font-medium">
            <div className="flex items-center gap-1">
              <Circle className="w-4 h-4 text-red-500" />
              <span className="text-red-700">Not discussed</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              <span className="text-yellow-700">Briefly covered</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-green-700">Thoroughly covered</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
        {categories.map((category) => (
          <div key={category} className="border-b border-gray-100 last:border-b-0">
            <button 
              onClick={() => toggleCategory(category)}
              className="w-full p-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
            >
              <h3 className="font-medium text-gray-900 text-sm flex items-center gap-2">
                {getCategoryIcon(category)}
                {category}
                <span className="text-xs text-gray-500">
                  ({topicsByCategory[category].length} topics)
                </span>
              </h3>
              {expandedCategories[category] ? 
                <ChevronDown className="w-4 h-4 text-gray-500" /> : 
                <ChevronRight className="w-4 h-4 text-gray-500" />
              }
            </button>
            
            {expandedCategories[category] && (
              <div className="p-2 space-y-2">
                {organizeTopicHierarchy(topicsByCategory[category]).map((topic) => (
                  <div key={topic.id}>
                    <div
                      className={`p-3 rounded-lg border transition-all duration-200 ${getStatusColor(topic.status)}`}
                    >
                      <div className="flex items-start gap-3">
                        {getStatusIcon(topic.status, topic.isRequired)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm leading-tight flex items-center">
                              {topic.name}
                              {topic.isRequired && (
                                <span className="ml-1 text-xs font-normal text-gray-600">
                                  (Required)
                                </span>
                              )}
                            </h4>
                            
                            {hasSubtopics(topic) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTopic(topic.id);
                                }}
                                className="p-1 rounded-full hover:bg-white/30"
                              >
                                {expandedTopics[topic.id] ? 
                                  <ChevronDown className="w-4 h-4" /> : 
                                  <ChevronRight className="w-4 h-4" />
                                }
                              </button>
                            )}
                          </div>
                          
                          {topic.description && (
                            <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                              {topic.description}
                            </p>
                          )}
                          
                          {hasTags(topic) && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500 flex items-center">
                                  <Tag className="w-3 h-3 mr-1" />
                                  Keywords
                                </span>
                                
                                {topic.keywords.length > 3 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleTags(topic.id);
                                    }}
                                    className="p-1 rounded-full hover:bg-white/30 text-xs text-gray-500 flex items-center"
                                  >
                                    {expandedTags[topic.id] ? 
                                      <ChevronDown className="w-3 h-3" /> : 
                                      <ChevronRight className="w-3 h-3" />
                                    }
                                    <span className="ml-1">
                                      {expandedTags[topic.id] ? "Show less" : "Show all"}
                                    </span>
                                  </button>
                                )}
                              </div>
                              
                              <div className="mt-1 flex flex-wrap gap-1">
                                {(expandedTags[topic.id] ? topic.keywords : topic.keywords.slice(0, 3)).map((keyword, index) => (
                                  <span
                                    key={index}
                                    className="inline-block px-2 py-1 text-xs bg-white bg-opacity-60 rounded-full"
                                  >
                                    {keyword}
                                  </span>
                                ))}
                                {!expandedTags[topic.id] && topic.keywords.length > 3 && (
                                  <span className="text-xs text-gray-500">
                                    +{topic.keywords.length - 3} more
                                  </span>
                                )}
                              </div>
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
                    
                    {/* Subtopics (if any and if expanded) */}
                    {hasSubtopics(topic) && expandedTopics[topic.id] && (
                      <div className="ml-8 mt-2 space-y-2">
                        {topic.subtopics?.map((subtopic) => (
                          <div
                            key={subtopic.id}
                            className={`p-3 rounded-lg border transition-all duration-200 ${getStatusColor(subtopic.status)}`}
                          >
                            <div className="flex items-start gap-3">
                              {getStatusIcon(subtopic.status, subtopic.isRequired)}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm leading-tight">
                                  {subtopic.name}
                                  {subtopic.isRequired && (
                                    <span className="ml-1 text-xs font-normal text-gray-600">
                                      (Required)
                                    </span>
                                  )}
                                </h4>
                                
                                {subtopic.description && (
                                  <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                                    {subtopic.description}
                                  </p>
                                )}
                                
                                {/* Tags for subtopics */}
                                {subtopic.keywords && subtopic.keywords.length > 0 && (
                                  <div className="mt-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-gray-500 flex items-center">
                                        <Tag className="w-3 h-3 mr-1" />
                                        Keywords
                                      </span>
                                      
                                      {subtopic.keywords.length > 3 && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleTags(subtopic.id);
                                          }}
                                          className="p-1 rounded-full hover:bg-white/30 text-xs text-gray-500 flex items-center"
                                        >
                                          {expandedTags[subtopic.id] ? 
                                            <ChevronDown className="w-3 h-3" /> : 
                                            <ChevronRight className="w-3 h-3" />
                                          }
                                          <span className="ml-1">
                                            {expandedTags[subtopic.id] ? "Show less" : "Show all"}
                                          </span>
                                        </button>
                                      )}
                                    </div>
                                    
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {(expandedTags[subtopic.id] ? subtopic.keywords : subtopic.keywords.slice(0, 3)).map((keyword, index) => (
                                        <span
                                          key={index}
                                          className="inline-block px-2 py-1 text-xs bg-white bg-opacity-60 rounded-full"
                                        >
                                          {keyword}
                                        </span>
                                      ))}
                                      {!expandedTags[subtopic.id] && subtopic.keywords.length > 3 && (
                                        <span className="text-xs text-gray-500">
                                          +{subtopic.keywords.length - 3} more
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {subtopic.coverageScore > 0 && (
                                  <div className="mt-2">
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 bg-white bg-opacity-60 rounded-full h-2">
                                        <div
                                          className={`h-2 rounded-full ${
                                            subtopic.coverageScore >= 70 
                                              ? 'bg-green-400' 
                                              : subtopic.coverageScore >= 30 
                                              ? 'bg-yellow-400' 
                                              : 'bg-red-400'
                                          }`}
                                          style={{ width: `${subtopic.coverageScore}%` }}
                                        />
                                      </div>
                                      <span className="text-xs font-medium">
                                        {subtopic.coverageScore}%
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 