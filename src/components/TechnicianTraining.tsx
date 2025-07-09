"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Award, HardHat, Cog, Stethoscope, AlertTriangle } from 'lucide-react';

export const TechnicianTraining: React.FC = () => {
  const handleStartTraining = (title: string) => {
    console.log(`Starting training: ${title}`);
  };

  const handleVoiceCommand = (command: string, module: string) => {
    console.log(`Voice command "${command}" for module: ${module}`);
  };

  const trainingModules = [
    {
      title: "Foundation Skills",
      duration: "2-3 weeks",
      hours: "40 hours",
      description: "Master essential safety protocols, basic engine systems understanding, and professional tool proficiency.",
      voicePrompt: "Hey Laborde, start foundation training",
      progress: 65,
      level: "beginner" as const,
      interactive: "Engine component identification, safety quiz simulations",
      icon: <HardHat className="h-6 w-6" />,
      isDemo: false,
      isActive: false
    },
    {
      title: "System Integration",
      duration: "1-2 weeks", 
      hours: "20 hours",
      description: "Understand how fuel, lubrication, cooling, and electrical systems work together.",
      voicePrompt: "Begin system integration module",
      progress: 30,
      level: "intermediate" as const,
      interactive: "Diagnostic decision trees, failure cascade simulations",
      icon: <Cog className="h-6 w-6" />,
      isDemo: false,
      isActive: false
    },
    {
      title: "🎯 ENGINE SOUND DIAGNOSTICS - TECHNICIAN DEMO",
      duration: "Live Demo",
      hours: "Interactive", 
      description: "ACTIVE DEMO: Advanced Mitsubishi S12R engine sound analysis. Identify engine problems through audio diagnosis, noise classification, and systematic troubleshooting protocols.",
      voicePrompt: "Start engine sound diagnostics",
      progress: 100,
      level: "advanced" as const,
      interactive: "🔊 Real engine sound samples, AI-powered noise classification, step-by-step diagnosis guide",
      icon: <Stethoscope className="h-6 w-6" />,
      isDemo: true,
      isActive: true
    },
    {
      title: "Emergency Response",
      duration: "1 week",
      hours: "15 hours",
      description: "Critical skills for at-sea troubleshooting and emergency situations.",
      voicePrompt: "Launch emergency scenarios",
      progress: 0,
      level: "intermediate" as const,
      interactive: "Time-critical simulations, radio communication practice",
      icon: <AlertTriangle className="h-6 w-6" />,
      isDemo: false,
      isActive: false
    }
  ];

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <section id="training" className="py-16 bg-background relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5"></div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-primary mb-4">
            Technician Training Program
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Comprehensive voice-activated training modules designed by marine engine experts.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {trainingModules.map((module, index) => (
            <Card 
              key={module.title} 
              className={`group transition-all duration-300 ${
                module.isActive 
                  ? 'hover:shadow-hover hover:-translate-y-1 border-2 border-accent ring-2 ring-accent/20' 
                  : 'opacity-50 cursor-not-allowed grayscale'
              }`}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-primary-foreground ${
                      module.isActive ? 'bg-gradient-primary' : 'bg-muted'
                    }`}>
                      {module.icon}
                    </div>
                    <div>
                      <CardTitle className={`text-xl transition-colors ${
                        module.isActive ? 'group-hover:text-primary' : 'text-muted-foreground'
                      }`}>
                        {module.title}
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge className={getLevelColor(module.level)} variant="secondary">
                          {module.level.charAt(0).toUpperCase() + module.level.slice(1)}
                        </Badge>
                        {module.isDemo && (
                          <Badge className="bg-accent text-accent-foreground animate-pulse">
                            LIVE DEMO
                          </Badge>
                        )}
                        {!module.isActive && (
                          <Badge className="bg-muted text-muted-foreground">
                            Coming Soon
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${module.isActive ? 'text-accent' : 'text-muted-foreground'}`}>
                      {module.progress}%
                    </div>
                    <div className="text-xs text-muted-foreground">Complete</div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">{module.description}</p>

                {/* Add diagnostic equipment image for the active demo */}
                {module.isDemo && module.isActive && (
                  <div className="relative rounded-lg overflow-hidden">
                    <img 
                      src="/assets/diagnostic-equipment.jpg" 
                      alt="Engine Diagnostic Equipment" 
                      className="w-full h-32 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-primary/20 flex items-center justify-center">
                      <span className="text-white font-semibold text-sm bg-accent/80 px-3 py-1 rounded-full">
                        🎧 Live Audio Analysis
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{module.duration}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{module.hours}</span>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-3">
                  <h4 className="font-medium text-sm mb-2 flex items-center">
                    <Award className="h-4 w-4 mr-2 text-accent" />
                    Interactive Features
                  </h4>
                  <p className="text-sm text-muted-foreground">{module.interactive}</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={() => module.isActive && handleStartTraining(module.title)}
                    className="flex-1"
                    disabled={!module.isActive}
                    variant={module.isActive ? "default" : "secondary"}
                  >
                    {module.isActive ? 'Launch Demo' : 'Coming Soon'}
                  </Button>
                  <Button 
                    variant={module.isActive ? "outline" : "secondary"}
                    className="flex-1"
                    disabled={!module.isActive}
                  >
                    {module.isActive ? '🎧 Listen to Sounds' : 'Preview'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}; 