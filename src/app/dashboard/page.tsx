'use client';

import { useState } from 'react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { AnalyticsCard } from '@/components/dashboard/analytics-card';
import { ProgressCard } from '@/components/dashboard/progress-card';
import { ChartPlaceholder } from '@/components/dashboard/chart-placeholder';
import { DataTable } from '@/components/dashboard/data-table';
import { DashboardTabs } from '@/components/dashboard/dashboard-tabs';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Users, 
  CheckCircle, 
  Clock, 
  Award, 
  BarChart, 
  LineChart, 
  Download,
  Calendar,
  TrendingUp
} from 'lucide-react';

export default function TraineeDashboardPage() {
  const [timeframe, setTimeframe] = useState('month');
  
  // Mock data for demonstration
  const stats = {
    trainingsCompleted: 8,
    passRate: 92,
    quizScore: 85,
    timeSpent: '14h 20m',
    nextCertification: '2023-12-15',
  };
  
  // Mock data for training modules
  const moduleData = [
    { id: 1, name: "Basketball Fundamentals", progress: 100, score: 95, completed: "2023-10-12" },
    { id: 2, name: "Advanced Dribbling", progress: 100, score: 88, completed: "2023-10-28" },
    { id: 3, name: "Shooting Techniques", progress: 75, score: null, completed: null },
    { id: 4, name: "Defensive Strategies", progress: 45, score: null, completed: null },
    { id: 5, name: "Team Coordination", progress: 0, score: null, completed: null },
  ];

  // Mock data for quiz performance
  const quizData = [
    { id: 1, module: "Basketball Fundamentals", score: 95, attempts: 1, date: "2023-10-12" },
    { id: 2, name: "Advanced Dribbling", score: 88, attempts: 2, date: "2023-10-28" },
    { id: 3, name: "Shooting Techniques - Quiz 1", score: 80, attempts: 1, date: "2023-11-05" },
  ];

  const moduleColumns = [
    {
      key: 'name',
      header: 'Module Name',
      cell: (row: any) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'progress',
      header: 'Progress',
      cell: (row: any) => (
        <div className="flex items-center">
          <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
            <div 
              className="bg-blue-500 h-2.5 rounded-full" 
              style={{ width: `${row.progress}%` }}
            ></div>
          </div>
          <span className="text-sm font-medium">{row.progress}%</span>
        </div>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      cell: (row: any) => (
        row.score ? <span className="font-medium">{row.score}%</span> : <span className="text-muted-foreground">-</span>
      ),
    },
    {
      key: 'completed',
      header: 'Completed',
      cell: (row: any) => (
        row.completed ? 
          <span>{new Date(row.completed).toLocaleDateString()}</span> : 
          <span className="text-muted-foreground">In progress</span>
      ),
    },
  ];

  const quizColumns = [
    {
      key: 'module',
      header: 'Quiz',
      cell: (row: any) => <span className="font-medium">{row.module}</span>,
    },
    {
      key: 'score',
      header: 'Score',
      cell: (row: any) => (
        <div className="flex items-center">
          <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
            <div 
              className={`h-2.5 rounded-full ${
                row.score >= 90 ? 'bg-green-500' : 
                row.score >= 70 ? 'bg-yellow-500' : 
                'bg-red-500'
              }`}
              style={{ width: `${row.score}%` }}
            ></div>
          </div>
          <span className="text-sm font-medium">{row.score}%</span>
        </div>
      ),
    },
    {
      key: 'attempts',
      header: 'Attempts',
      cell: (row: any) => <span>{row.attempts}</span>,
    },
    {
      key: 'date',
      header: 'Date',
      cell: (row: any) => <span>{new Date(row.date).toLocaleDateString()}</span>,
    },
  ];

  const tabs = [
    {
      value: 'overview',
      label: 'Overview',
      content: (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard 
              title="Trainings Completed" 
              value={stats.trainingsCompleted} 
              icon={<BookOpen className="h-4 w-4" />} 
            />
            <StatsCard 
              title="Average Quiz Score" 
              value={`${stats.quizScore}%`} 
              icon={<CheckCircle className="h-4 w-4" />} 
            />
            <StatsCard 
              title="Time Spent Learning" 
              value={stats.timeSpent} 
              icon={<Clock className="h-4 w-4" />} 
            />
            <StatsCard 
              title="Pass Rate" 
              value={`${stats.passRate}%`} 
              icon={<Award className="h-4 w-4" />} 
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <AnalyticsCard 
              title="Learning Progress" 
              description="Your activity over time"
              action={
                <div className="flex space-x-2">
                  <Button 
                    variant={timeframe === 'week' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setTimeframe('week')}
                  >
                    Week
                  </Button>
                  <Button 
                    variant={timeframe === 'month' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setTimeframe('month')}
                  >
                    Month
                  </Button>
                  <Button 
                    variant={timeframe === 'year' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setTimeframe('year')}
                  >
                    Year
                  </Button>
                </div>
              }
            >
              <ChartPlaceholder type="line" height={250} />
            </AnalyticsCard>
            
            <AnalyticsCard 
              title="Quiz Performance" 
              description="Your scores across different modules"
            >
              <ChartPlaceholder type="bar" height={250} />
            </AnalyticsCard>
          </div>

          <AnalyticsCard 
            title="Your Training Modules" 
            description="Progress and completion status"
          >
            <DataTable 
              columns={moduleColumns} 
              data={moduleData} 
            />
          </AnalyticsCard>
        </div>
      ),
    },
    {
      value: 'quizzes',
      label: 'Quizzes',
      content: (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <ProgressCard 
              title="Overall Quiz Score" 
              value={85} 
              max={100}
              progressColor="bg-blue-500"
            />
            <StatsCard 
              title="Quizzes Taken" 
              value="12" 
              icon={<CheckCircle className="h-4 w-4" />} 
            />
            <StatsCard 
              title="First Attempt Pass Rate" 
              value="75%" 
              icon={<TrendingUp className="h-4 w-4" />} 
            />
            <StatsCard 
              title="Highest Score" 
              value="98%" 
              icon={<Award className="h-4 w-4" />} 
            />
          </div>

          <AnalyticsCard 
            title="Quiz History" 
            description="Your quiz attempts and scores"
          >
            <DataTable 
              columns={quizColumns} 
              data={quizData} 
            />
          </AnalyticsCard>
          
          <div className="grid gap-4 md:grid-cols-2">
            <AnalyticsCard 
              title="Score Trends" 
              description="Your quiz performance over time"
            >
              <ChartPlaceholder type="line" height={250} />
            </AnalyticsCard>
            
            <AnalyticsCard 
              title="Strengths and Weaknesses" 
              description="Performance by topic area"
            >
              <ChartPlaceholder type="bar" height={250} />
            </AnalyticsCard>
          </div>
        </div>
      ),
    },
    {
      value: 'certifications',
      label: 'Certifications',
      content: (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard 
              title="Certifications Earned" 
              value="2" 
              icon={<Award className="h-4 w-4" />} 
            />
            <StatsCard 
              title="Next Certification" 
              value={new Date(stats.nextCertification).toLocaleDateString()} 
              icon={<Calendar className="h-4 w-4" />} 
            />
            <StatsCard 
              title="Voice Certification Score" 
              value="88%" 
              icon={<TrendingUp className="h-4 w-4" />} 
            />
            <StatsCard 
              title="Certification Attempts" 
              value="3" 
              icon={<Users className="h-4 w-4" />} 
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <AnalyticsCard 
              title="Certification Timeline" 
              description="Your certification journey"
            >
              <ChartPlaceholder type="line" height={250} />
            </AnalyticsCard>
            
            <AnalyticsCard 
              title="Voice Certification Analysis" 
              description="Performance metrics from your voice assessments"
            >
              <ChartPlaceholder type="bar" height={250} />
            </AnalyticsCard>
          </div>

          <AnalyticsCard 
            title="Certification Requirements" 
            description="Progress towards your next certification"
          >
            <div className="space-y-4 py-2">
              <ProgressCard 
                title="Complete Required Modules" 
                value={3} 
                max={5}
                description="3 of 5 modules completed"
              />
              <ProgressCard 
                title="Pass All Module Quizzes" 
                value={2} 
                max={5}
                description="2 of 5 quizzes passed"
              />
              <ProgressCard 
                title="Complete Voice Assessment" 
                value={0} 
                max={1}
                description="Not started"
              />
            </div>
          </AnalyticsCard>
        </div>
      ),
    },
  ];

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Your Learning Dashboard</h1>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Export Progress
        </Button>
      </div>
      
      <DashboardTabs tabs={tabs} />
    </div>
  );
} 