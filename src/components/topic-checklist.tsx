'use client';

import { CheckCircle, Circle, AlertCircle, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

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
  
  // Track previous topics list to detect changes
  const [previousTopicsLength, setPreviousTopicsLength] = useState(0);
  const [hasNewTopics, setHasNewTopics] = useState(false);

  // Effect to track when new topics are added
  useEffect(() => {
    if (topics.length > previousTopicsLength) {
      setHasNewTopics(true);
      // Reset after animation time
      setTimeout(() => setHasNewTopics(false), 2000);
    }
    setPreviousTopicsLength(topics.length);
  }, [topics.length, previousTopicsLength]);

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

  const getStatusColor = (status: string, isNew = false) => {
    const baseClasses = isNew ? 'animate-pulse' : '';
    
    switch (status) {
      case 'thoroughly-covered':
        return `${baseClasses} text-green-800 border-l-4 border-l-green-500`;
      case 'briefly-discussed':
        return `${baseClasses} text-yellow-800 border-l-4 border-l-yellow-500`;
      case 'not-discussed':
      default:
        return `${baseClasses} text-gray-800 border-l-4 border-l-red-500`;
    }
  };

  const categories = Object.keys(topicsByCategory).sort();

  // Function to determine if a topic has subtopics
  const hasSubtopics = (topic: TopicItem) => {
    return topic.subtopics && topic.subtopics.length > 0;
  };

  // Group topics by parent/child relationship if not already done
  const organizeTopicHierarchy = (topicsInCategory: TopicItem[]) => {
    // Implementation would depend on how your data is structured
    // This is a simple example that assumes subtopics are already defined
    return topicsInCategory;
  };

  // Calculate the total percentage of topics covered
  const calculateTotalCoverage = () => {
    let totalTopics = 0;
    let coveredTopics = 0;
    
    topics.forEach(topic => {
      totalTopics++;
      if (topic.status === 'thoroughly-covered') {
        coveredTopics++;
      } else if (topic.status === 'briefly-discussed') {
        coveredTopics += 0.5; // Count briefly-discussed as half covered
      }
      
      if (topic.subtopics) {
        topic.subtopics.forEach(subtopic => {
          totalTopics++;
          if (subtopic.status === 'thoroughly-covered') {
            coveredTopics++;
          } else if (subtopic.status === 'briefly-discussed') {
            coveredTopics += 0.5;
          }
        });
      }
    });
    
    return totalTopics > 0 ? Math.round((coveredTopics / totalTopics) * 100) : 0;
  };

  const coveragePercentage = calculateTotalCoverage();

  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 min-w-[300px] w-full ${className}`}>
      <div className="p-4 border-b border-gray-200 bg-blue-50">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Topic Coverage Checklist
        </h2>
        
        {/* Overall progress indicator */}
        <div className="mt-3">
          <div className="flex justify-between mb-1 text-xs">
            <span className="font-medium">Overall Coverage</span>
            <span className="font-medium">{coveragePercentage}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                coveragePercentage >= 70 ? 'bg-green-500' : 
                coveragePercentage >= 30 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${coveragePercentage}%` }}
            />
          </div>
        </div>
        
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
              <span className="text-green-700">Thorough</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
        {categories.map((category) => (
          <div key={category} className="border-b border-gray-100 last:border-b-0">
            <button 
              onClick={() => toggleCategory(category)}
              className="w-full p-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
            >
              <h3 className="font-medium text-gray-900 text-sm flex items-center gap-2">
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
              <div className="py-1 px-1">
                {organizeTopicHierarchy(topicsByCategory[category]).map((topic) => (
                  <div key={topic.id} className="mb-1 last:mb-0">
                    <div
                      className={`py-2 px-3 rounded hover:bg-gray-50 transition-all duration-200 ${getStatusColor(topic.status, hasNewTopics)}`}
                    >
                      <div className="flex items-start">
                        <div className="pt-0.5 mr-2 flex-shrink-0">
                          {getStatusIcon(topic.status, topic.isRequired)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm leading-tight truncate max-w-[200px]">
                              {topic.name}
                              {topic.isRequired && (
                                <span className="ml-1 text-xs font-normal text-gray-600">*</span>
                              )}
                            </h4>
                            
                            {hasSubtopics(topic) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTopic(topic.id);
                                }}
                                className="p-1 rounded-full hover:bg-white/30 ml-1 flex-shrink-0"
                              >
                                {expandedTopics[topic.id] ? 
                                  <ChevronDown className="w-4 h-4" /> : 
                                  <ChevronRight className="w-4 h-4" />
                                }
                              </button>
                            )}
                          </div>
                          
                          {topic.coverageScore > 0 && (
                            <div className="mt-1">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className={`h-1.5 rounded-full ${
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
                      <div className="ml-7 mt-1 space-y-1">
                        {topic.subtopics?.map((subtopic) => (
                          <div
                            key={subtopic.id}
                            className={`py-1.5 px-3 rounded-sm hover:bg-gray-50 transition-all duration-200 ${getStatusColor(subtopic.status, hasNewTopics)}`}
                          >
                            <div className="flex items-start">
                              <div className="pt-0.5 mr-2 flex-shrink-0">
                                {getStatusIcon(subtopic.status, subtopic.isRequired)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-xs leading-tight truncate max-w-[180px]">
                                  {subtopic.name}
                                  {subtopic.isRequired && (
                                    <span className="ml-1 text-xs font-normal text-gray-600">*</span>
                                  )}
                                </h4>
                                
                                {subtopic.coverageScore > 0 && (
                                  <div className="mt-1">
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 bg-gray-200 rounded-full h-1">
                                        <div
                                          className={`h-1 rounded-full ${
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