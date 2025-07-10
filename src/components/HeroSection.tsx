"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Wrench, GraduationCap, Shield, Zap } from 'lucide-react';
import Image from 'next/image';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative text-primary-foreground py-20 overflow-hidden">
      {/* Single Clean Hero Background */}
      <div className="absolute inset-0">
        <Image 
          src="/assets/hero-banner.jpg" 
          alt="Laborde Products Marine Engine Training" 
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-primary/80"></div>
      </div>
      
      {/* Subtle overlay pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="relative container mx-auto px-4 text-center">
        <div className="animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            AI Marine
            <br />
            <span className="text-accent">Engine Training</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-primary-foreground/90 max-w-3xl mx-auto">
            Powering Products. Empowering People.
          </p>
          <p className="text-lg mb-12 text-primary-foreground/80 max-w-2xl mx-auto">
            Advanced voice-activated training platform for Mitsubishi, Scania, Steyr Motors, and Yanmar marine engines
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-16 animate-slide-up">
          <Button 
            size="lg" 
            onClick={() => {
              const trainingSection = document.getElementById('training');
              trainingSection?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="h-16 text-lg bg-card text-card-foreground hover:bg-card/90 shadow-hover group"
          >
            <Wrench className="h-6 w-6 mr-3 group-hover:animate-bounce-gentle font-bold" />
            TECHNICIAN TRAINING
          </Button>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => {
              const educationSection = document.getElementById('education');
              educationSection?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="h-16 text-lg shadow-hover group"
          >
            <GraduationCap className="h-6 w-6 mr-3 group-hover:animate-bounce-gentle font-bold" />
            BUYER EDUCATION
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12 animate-slide-up" style={{animationDelay: '0.2s'}}>
          <div className="text-center">
            <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">1000+ Engines</h3>
            <p className="text-primary-foreground/80">Mitsubishi engines deployed across Gulf Coast</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">$5.9M R&D</h3>
            <p className="text-primary-foreground/80">Investment in training technology</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">20+ Years</h3>
            <p className="text-primary-foreground/80">Marine engine expertise</p>
          </div>
        </div>

      </div>
    </section>
  );
}; 