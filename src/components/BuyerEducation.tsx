"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Award, Search, Calculator, CheckCircle, CreditCard, Play } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export const BuyerEducation: React.FC = () => {
  const router = useRouter();

  const handleStartEducation = (title: string) => {
    console.log(`Starting education: ${title}`);
    
    // Redirect to specific training module for engine sound evaluation demo
    if (title.includes('ENGINE SOUND EVALUATION')) {
      router.push('/training/56178fd2-8106-4b4f-8567-0217fac890f2');
    }
  };

  const handleVoiceCommand = (command: string, module: string) => {
    console.log(`Voice command "${command}" for module: ${module}`);
  };

  const educationModules = [
    {
      title: "Engine Selection Guide",
      duration: "30 minutes",
      hours: "Quick Start",
      description: "Compare Mitsubishi, Scania, and Steyr engines for your specific vessel needs.",
      voicePrompt: "Help me choose an engine",
      progress: 0,
      level: "beginner" as const,
      interactive: "Vessel requirement calculator, cost analysis tools",
      icon: <Search className="h-6 w-6" />,
      isDemo: false,
      isActive: false
    },
    {
      title: "🎯 ENGINE SOUND EVALUATION - BUYER DEMO",
      duration: "Live Demo",
      hours: "Interactive",
      description: "ACTIVE DEMO: Learn to evaluate engine health through sound analysis. Perfect for pre-purchase inspections and understanding what healthy vs. problematic engines sound like.",
      voicePrompt: "Help me evaluate engine sounds",
      progress: 100,
      level: "intermediate" as const,
      interactive: "🔊 Engine sound library, healthy vs. problem comparisons, buying decision guide",
      icon: <CheckCircle className="h-6 w-6" />,
      isDemo: true,
      isActive: true
    },
    {
      title: "Total Cost of Ownership",
      duration: "45 minutes",
      hours: "Essential",
      description: "Understand the complete financial picture beyond purchase price.",
      voicePrompt: "Calculate ownership costs",
      progress: 0,
      level: "intermediate" as const,
      interactive: "ROI calculator, maintenance schedule planner",
      icon: <Calculator className="h-6 w-6" />,
      isDemo: false,
      isActive: false
    },
    {
      title: "Financing & Support",
      duration: "20 minutes",
      hours: "Final Step",
      description: "Explore financing options and Laborde's comprehensive support network.",
      voicePrompt: "Explore financing options",
      progress: 0,
      level: "beginner" as const,
      interactive: "Payment calculators, service location finder",
      icon: <CreditCard className="h-6 w-6" />,
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
    <section id="education" className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-primary mb-4">
            Buyer Education Center
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Make informed decisions with expert guidance. Voice-activated modules to help you choose the right marine engine.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
          {educationModules.map((module, index) => (
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
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">{module.description}</p>

                {/* Add vessel image for the active demo */}
                {module.isDemo && module.isActive && (
                  <div className="relative rounded-lg overflow-hidden">
                    <Image 
                      src="/assets/gulf-coast-vessel.jpg" 
                      alt="Gulf Coast Commercial Vessel" 
                      width={400}
                      height={128}
                      className="w-full h-32 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-primary/20 flex items-center justify-center">
                      <span className="text-white font-semibold text-sm bg-accent/80 px-3 py-1 rounded-full">
                        🎧 Engine Sound Comparison
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
                    onClick={() => module.isActive && handleStartEducation(module.title)}
                    className="w-full"
                    disabled={!module.isActive}
                    variant={module.isActive ? "default" : "secondary"}
                  >
                    {module.isActive ? 'Launch Demo' : 'Coming Soon'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-card rounded-lg p-6 text-center shadow-card border border-accent/20">
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-xl font-bold text-white drop-shadow-lg">1000+</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Engines</h3>
            <p className="text-muted-foreground">Mitsubishi engines deployed across Gulf Coast</p>
          </div>
          <div className="bg-card rounded-lg p-6 text-center shadow-card border border-accent/20">
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-xl font-bold text-white drop-shadow-lg">$5.9M</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">R&D</h3>
            <p className="text-muted-foreground">Investment in training technology</p>
          </div>
          <div className="bg-card rounded-lg p-6 text-center shadow-card border border-accent/20">
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-2xl font-bold text-white drop-shadow-lg">20+</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Years</h3>
            <p className="text-muted-foreground">Marine engine expertise</p>
          </div>
        </div>
      </div>
    </section>
  );
}; 