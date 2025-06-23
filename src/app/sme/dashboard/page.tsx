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
  ChevronDown
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SMEDashboardPage() {
  const [timeframe, setTimeframe] = useState('month');
  const [selectedModule, setSelectedModule] = useState('all');
  
  // Mock data for demonstration
  const stats = {
    proceduresCreated: 24,
    totalTrainees: 156,
    completionRate: 78,
    avgTimeSpent: '2h 45m',
    certificationRate: 92,
  };
  
  // Mock modules for dropdown
  const modules = [
    { id: 'all', name: 'All Modules' },
    { id: 'basketball-fundamentals', name: 'Basketball Fundamentals' },
    { id: 'advanced-dribbling', name: 'Advanced Dribbling' },
    { id: 'shooting-techniques', name: 'Shooting Techniques' },
    { id: 'defensive-strategies', name: 'Defensive Strategies' },
    { id: 'team-coordination', name: 'Team Coordination' },
  ];
  
  // Mock data for questions analytics
  const allQuestionData = {
    'all': [
      { id: 1, question: "What is the proper technique for ball handling?", correct: 85, incorrect: 15 },
      { id: 2, question: "Which shooting stance is recommended for beginners?", correct: 62, incorrect: 38 },
      { id: 3, question: "How should you position your feet when defending?", correct: 74, incorrect: 26 },
      { id: 4, question: "What is the correct form for a layup?", correct: 91, incorrect: 9 },
      { id: 5, question: "Which passing technique is best for long distances?", correct: 68, incorrect: 32 },
    ],
    'basketball-fundamentals': [
      { id: 1, question: "What is the proper technique for ball handling?", correct: 85, incorrect: 15 },
      { id: 2, question: "How do you hold the ball correctly?", correct: 79, incorrect: 21 },
      { id: 3, question: "What is the triple threat position?", correct: 82, incorrect: 18 },
      { id: 4, question: "How do you execute a proper bounce pass?", correct: 88, incorrect: 12 },
      { id: 5, question: "What is the correct stance for defense?", correct: 75, incorrect: 25 },
    ],
    'advanced-dribbling': [
      { id: 1, question: "What is a crossover dribble?", correct: 92, incorrect: 8 },
      { id: 2, question: "How do you perform a behind-the-back dribble?", correct: 67, incorrect: 33 },
      { id: 3, question: "What is the purpose of a hesitation dribble?", correct: 73, incorrect: 27 },
      { id: 4, question: "How do you protect the ball while dribbling?", correct: 81, incorrect: 19 },
      { id: 5, question: "What is a euro step?", correct: 59, incorrect: 41 },
    ],
    'shooting-techniques': [
      { id: 1, question: "Which shooting stance is recommended for beginners?", correct: 62, incorrect: 38 },
      { id: 2, question: "What is BEEF in shooting technique?", correct: 77, incorrect: 23 },
      { id: 3, question: "How do you improve shooting accuracy?", correct: 70, incorrect: 30 },
      { id: 4, question: "What is the correct form for a jump shot?", correct: 65, incorrect: 35 },
      { id: 5, question: "How should you position your elbow when shooting?", correct: 72, incorrect: 28 },
    ],
    'defensive-strategies': [
      { id: 1, question: "How should you position your feet when defending?", correct: 74, incorrect: 26 },
      { id: 2, question: "What is a zone defense?", correct: 68, incorrect: 32 },
      { id: 3, question: "How do you defend against a pick and roll?", correct: 55, incorrect: 45 },
      { id: 4, question: "What is the proper stance for on-ball defense?", correct: 79, incorrect: 21 },
      { id: 5, question: "How do you contest a shot without fouling?", correct: 63, incorrect: 37 },
    ],
    'team-coordination': [
      { id: 1, question: "What is the correct form for a layup?", correct: 91, incorrect: 9 },
      { id: 2, question: "How do you execute a fast break?", correct: 76, incorrect: 24 },
      { id: 3, question: "What is a pick and roll?", correct: 83, incorrect: 17 },
      { id: 4, question: "How do you set an effective screen?", correct: 69, incorrect: 31 },
      { id: 5, question: "Which passing technique is best for long distances?", correct: 68, incorrect: 32 },
    ],
  };
  
  // Get the questions for the selected module
  const questionData = allQuestionData[selectedModule as keyof typeof allQuestionData];

  // Mock data for procedures
  const procedureData = [
    { id: 1, name: "Basketball Fundamentals", trainees: 45, completion: 82, rating: 4.8 },
    { id: 2, name: "Advanced Dribbling", trainees: 32, completion: 75, rating: 4.6 },
    { id: 3, name: "Shooting Techniques", trainees: 38, completion: 79, rating: 4.9 },
    { id: 4, name: "Defensive Strategies", trainees: 26, completion: 68, rating: 4.5 },
    { id: 5, name: "Team Coordination", trainees: 15, completion: 60, rating: 4.7 },
  ];

  const questionColumns = [
    {
      key: 'question',
      header: 'Question',
      cell: (row: any) => <span className="font-medium">{row.question}</span>,
    },
    {
      key: 'correct',
      header: 'Correct',
      cell: (row: any) => (
        <div className="flex items-center">
          <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
            <div 
              className="bg-green-500 h-2.5 rounded-full" 
              style={{ width: `${row.correct}%` }}
            ></div>
          </div>
          <span className="text-sm font-medium">{row.correct}%</span>
        </div>
      ),
    },
    {
      key: 'incorrect',
      header: 'Incorrect',
      cell: (row: any) => (
        <div className="flex items-center">
          <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
            <div 
              className="bg-red-500 h-2.5 rounded-full" 
              style={{ width: `${row.incorrect}%` }}
            ></div>
          </div>
          <span className="text-sm font-medium">{row.incorrect}%</span>
        </div>
      ),
    },
  ];

  const procedureColumns = [
    {
      key: 'name',
      header: 'Procedure Name',
      cell: (row: any) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'trainees',
      header: 'Trainees',
      cell: (row: any) => <span>{row.trainees}</span>,
    },
    {
      key: 'completion',
      header: 'Completion',
      cell: (row: any) => (
        <div className="flex items-center">
          <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
            <div 
              className="bg-blue-500 h-2.5 rounded-full" 
              style={{ width: `${row.completion}%` }}
            ></div>
          </div>
          <span className="text-sm font-medium">{row.completion}%</span>
        </div>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      cell: (row: any) => (
        <div className="flex items-center">
          <span className="text-sm font-medium mr-2">{row.rating}</span>
          <div className="flex">
            {Array(5).fill(0).map((_, i) => (
              <svg 
                key={i} 
                className={`w-4 h-4 ${i < Math.floor(row.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                aria-hidden="true" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="currentColor" 
                viewBox="0 0 22 20"
              >
                <path d="M20.924 7.625a1.523 1.523 0 0 0-1.238-1.044l-5.051-.734-2.259-4.577a1.534 1.534 0 0 0-2.752 0L7.365 5.847l-5.051.734A1.535 1.535 0 0 0 1.463 9.2l3.656 3.563-.863 5.031a1.532 1.532 0 0 0 2.226 1.616L11 17.033l4.518 2.375a1.534 1.534 0 0 0 2.226-1.617l-.863-5.03L20.537 9.2a1.523 1.523 0 0 0 .387-1.575Z"/>
              </svg>
            ))}
          </div>
        </div>
      ),
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
              title="Procedures Created" 
              value={stats.proceduresCreated} 
              icon={<BookOpen className="h-4 w-4" />} 
            />
            <StatsCard 
              title="Total Trainees" 
              value={stats.totalTrainees} 
              icon={<Users className="h-4 w-4" />} 
            />
            <StatsCard 
              title="Completion Rate" 
              value={`${stats.completionRate}%`} 
              icon={<CheckCircle className="h-4 w-4" />} 
            />
            <StatsCard 
              title="Certification Rate" 
              value={`${stats.certificationRate}%`} 
              icon={<Award className="h-4 w-4" />} 
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <AnalyticsCard 
              title="Training Engagement" 
              description="Trainee activity over time"
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
              title="Completion by Module" 
              description="Percentage of trainees completing each module"
            >
              <ChartPlaceholder type="bar" height={250} />
            </AnalyticsCard>
          </div>

          <AnalyticsCard 
            title="Question Performance" 
            description="Percentage of correct vs incorrect answers"
            action={
              <div className="flex items-center space-x-2">
                <Select
                  value={selectedModule}
                  onValueChange={(value) => setSelectedModule(value)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select Module" />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.map((module) => (
                      <SelectItem key={module.id} value={module.id}>
                        {module.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            }
          >
            <DataTable 
              columns={questionColumns} 
              data={questionData} 
            />
          </AnalyticsCard>
        </div>
      ),
    },
    {
      value: 'procedures',
      label: 'Procedures',
      content: (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <ProgressCard 
              title="Overall Completion" 
              value={78} 
              max={100}
              progressColor="bg-blue-500"
            />
            <ProgressCard 
              title="Voice Certification" 
              value={65} 
              max={100}
              progressColor="bg-purple-500"
            />
            <StatsCard 
              title="Avg. Time Spent" 
              value={stats.avgTimeSpent} 
              icon={<Clock className="h-4 w-4" />} 
            />
            <StatsCard 
              title="Avg. Rating" 
              value="4.7" 
              description="Based on trainee feedback"
              icon={<Award className="h-4 w-4" />} 
            />
          </div>

          <AnalyticsCard 
            title="Procedure Analytics" 
            description="Performance metrics for each procedure"
            action={
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            }
          >
            <DataTable 
              columns={procedureColumns} 
              data={procedureData} 
            />
          </AnalyticsCard>
          
          <div className="grid gap-4 md:grid-cols-2">
            <AnalyticsCard 
              title="Completion Time Distribution" 
              description="Time taken to complete procedures"
            >
              <ChartPlaceholder type="bar" height={250} />
            </AnalyticsCard>
            
            <AnalyticsCard 
              title="Trainee Progress" 
              description="Progress of trainees over time"
            >
              <ChartPlaceholder type="line" height={250} />
            </AnalyticsCard>
          </div>
        </div>
      ),
    },
    {
      value: 'voice-certification',
      label: 'Voice Certification',
      content: (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard 
              title="Total Attempts" 
              value="143" 
              icon={<Users className="h-4 w-4" />} 
            />
            <StatsCard 
              title="Pass Rate" 
              value="76%" 
              icon={<CheckCircle className="h-4 w-4" />} 
            />
            <StatsCard 
              title="Avg. Duration" 
              value="12m 30s" 
              icon={<Clock className="h-4 w-4" />} 
            />
            <StatsCard 
              title="Accuracy Score" 
              value="84%" 
              icon={<Award className="h-4 w-4" />} 
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <AnalyticsCard 
              title="Certification Success Rate" 
              description="Pass/fail rate over time"
            >
              <ChartPlaceholder type="line" height={250} />
            </AnalyticsCard>
            
            <AnalyticsCard 
              title="Common Failure Points" 
              description="Areas where trainees struggle most"
            >
              <ChartPlaceholder type="bar" height={250} />
            </AnalyticsCard>
          </div>

          <AnalyticsCard 
            title="Voice Recognition Accuracy" 
            description="System performance metrics"
          >
            <ChartPlaceholder height={250} />
          </AnalyticsCard>
        </div>
      ),
    },
  ];

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">SME Dashboard</h1>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>
      
      <DashboardTabs tabs={tabs} />
    </div>
  );
} 