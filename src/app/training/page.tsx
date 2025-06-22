'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { 
  BookOpen, 
  Award, 
  Clock, 
  Search,
  CheckCircle,
  Play,
  Star,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';

interface TrainingModule {
  id: string;
  title: string;
  procedureTitle: string;
  subtopics: any[];
  isApproved: boolean;
  createdAt: string;
  estimatedTime: number;
  progress?: {
    progressPercentage: number;
    completedSubtopics: string[];
    timeSpent: number;
  };
  certification?: {
    status: string;
    passed: boolean;
    certifiedAt?: string;
    overallScore?: number;
  };
}

export default function TrainingDashboard() {
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'in-progress' | 'completed' | 'certified'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTrainingModules();
  }, []);

  const loadTrainingModules = async () => {
    try {
      // This would be replaced with actual user ID from auth
      const userId = 'current-user-id';
      
      const response = await fetch(`/api/training/modules?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setModules(data.modules);
      }
    } catch (error) {
      console.error('Error loading training modules:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredModules = modules.filter(module => {
    // Filter by search term
    const matchesSearch = module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         module.procedureTitle.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by status
    let matchesFilter = true;
    switch (filter) {
      case 'in-progress':
        matchesFilter = (module.progress?.progressPercentage || 0) > 0 && 
                       (module.progress?.progressPercentage || 0) < 100;
        break;
      case 'completed':
        matchesFilter = (module.progress?.progressPercentage || 0) === 100;
        break;
      case 'certified':
        matchesFilter = module.certification?.passed === true;
        break;
      default:
        matchesFilter = true;
    }
    
    return matchesSearch && matchesFilter && module.isApproved;
  });

  const stats = {
    total: modules.filter(m => m.isApproved).length,
    inProgress: modules.filter(m => (m.progress?.progressPercentage || 0) > 0 && (m.progress?.progressPercentage || 0) < 100).length,
    completed: modules.filter(m => (m.progress?.progressPercentage || 0) === 100).length,
    certified: modules.filter(m => m.certification?.passed === true).length
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading training modules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Training & Certification</h1>
          <p className="text-gray-600 mt-2">
            Complete training modules and earn voice certifications for procedures
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          {stats.certified} Certifications Earned
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Certified</p>
                <p className="text-2xl font-bold">{stats.certified}</p>
              </div>
              <Award className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search training modules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          {(['all', 'in-progress', 'completed', 'certified'] as const).map((filterOption) => (
            <Button
              key={filterOption}
              variant={filter === filterOption ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(filterOption)}
              className="capitalize"
            >
              {filterOption.replace('-', ' ')}
            </Button>
          ))}
        </div>
      </div>

      {/* Training Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModules.map((module) => (
          <Card key={module.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{module.procedureTitle}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {module.subtopics.length} topics • ~{module.estimatedTime} minutes
                  </p>
                </div>
                
                {module.certification?.passed && (
                  <Badge variant="default" className="bg-purple-600">
                    <Award className="w-3 h-3 mr-1" />
                    Certified
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Progress</span>
                  <span className="text-sm font-medium">
                    {module.progress?.progressPercentage || 0}%
                  </span>
                </div>
                <Progress 
                  value={module.progress?.progressPercentage || 0} 
                  className="h-2" 
                />
              </div>

              {/* Time Spent */}
              {module.progress?.timeSpent && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  {Math.floor(module.progress.timeSpent / 60)} minutes spent
                </div>
              )}

              {/* Certification Score */}
              {module.certification?.overallScore && (
                <div className="flex items-center gap-2 text-sm">
                  <Star className="w-4 h-4 text-yellow-500" />
                  Score: {module.certification.overallScore}%
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Link href={`/training/${module.id}`} className="flex-1">
                  <Button className="w-full" variant="default">
                    <Play className="w-4 h-4 mr-2" />
                    {module.progress?.progressPercentage === 100 ? 'Review' : 'Continue'}
                  </Button>
                </Link>
                
                {module.progress?.progressPercentage === 100 && !module.certification?.passed && (
                  <Link href={`/certification/${module.id}`}>
                    <Button variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50">
                      <Award className="w-4 h-4 mr-1" />
                      Certify
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredModules.length === 0 && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No training modules found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Training modules will appear here once SMEs publish procedures with approved content.'}
            </p>
            {(searchTerm || filter !== 'all') && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setFilter('all');
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Start Guide */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-3 text-blue-900">How Training & Certification Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">1</div>
              <div>
                <p className="font-medium text-blue-900">Learn</p>
                <p className="text-blue-700">Complete interactive training modules with articles and embedded quizzes</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">2</div>
              <div>
                <p className="font-medium text-blue-900">Quiz</p>
                <p className="text-blue-700">Pass quizzes for each topic (80% required, retakes allowed)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">3</div>
              <div>
                <p className="font-medium text-blue-900">Certify</p>
                <p className="text-blue-700">Complete adaptive voice interview to earn your certification</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 