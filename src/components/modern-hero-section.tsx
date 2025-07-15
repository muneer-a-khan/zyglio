"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  Mic, 
  Brain, 
  Award, 
  Play, 
  ChevronRight, 
  Zap, 
  Users, 
  TrendingUp,
  ShieldCheck,
  Target,
  Clock
} from 'lucide-react';
import Link from 'next/link';

export const ModernHeroSection = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        duration: 0.6
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  const floatingAnimation = {
    initial: { y: 0 },
    animate: {
      y: [-10, 10, -10],
      transition: {
        duration: 6,
        repeat: Infinity
      }
    }
  };

  const industries = [
    { name: "Restaurant", icon: "🍽️", color: "bg-orange-500" },
    { name: "Marine", icon: "⚓", color: "bg-blue-500" },
    { name: "Healthcare", icon: "🏥", color: "bg-green-500" }
  ];

  const stats = [
    { value: "95%", label: "Accuracy Rate", icon: Target },
    { value: "70%", label: "Time Saved", icon: Clock },
    { value: "15K+", label: "Trained Users", icon: Users }
  ];

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 overflow-hidden">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="relative z-10">
        <motion.div
          className="container mx-auto px-4 pt-20 pb-16"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header Badge */}
          <motion.div className="flex justify-center mb-8" variants={itemVariants}>
            <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 text-sm font-medium">
              <Zap className="w-4 h-4 mr-2" />
              Next-Gen Voice AI Training
            </Badge>
          </motion.div>

          {/* Main Heading */}
          <motion.div className="text-center max-w-5xl mx-auto mb-12" variants={itemVariants}>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 bg-clip-text text-transparent leading-tight">
              Transform Training with
              <br />
              <span className="text-gradient bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Voice AI Technology
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Zyglio revolutionizes professional training and certification across industries using cutting-edge voice AI technology.
            </p>
          </motion.div>

          {/* Industry Tags */}
          <motion.div className="flex justify-center mb-12" variants={itemVariants}>
            <div className="flex flex-wrap gap-4 justify-center">
              {industries.map((industry, index) => (
                <motion.div
                  key={industry.name}
                  className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-white/20"
                  whileHover={{ scale: 1.05 }}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ 
                    opacity: 1, 
                    x: 0,
                    transition: { delay: index * 0.2 }
                  }}
                >
                  <span className="text-2xl">{industry.icon}</span>
                  <span className="font-medium text-slate-700">{industry.name}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div className="flex flex-col sm:flex-row gap-4 justify-center mb-16" variants={itemVariants}>
            <Link href="/demo">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 group"
              >
                <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Try Live Demo
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/training">
              <Button 
                size="lg" 
                variant="outline"
                className="border-2 border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-4 text-lg font-semibold"
              >
                <Award className="w-5 h-5 mr-2" />
                Explore Training
              </Button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16" variants={itemVariants}>
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                className="text-center bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20"
                whileHover={{ scale: 1.05 }}
                initial={{ opacity: 0, y: 50 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  transition: { delay: index * 0.1 }
                }}
              >
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-2">{stat.value}</h3>
                <p className="text-slate-600 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Floating Voice Visualization */}
          <motion.div
            className="flex justify-center"
            variants={floatingAnimation}
            initial="initial"
            animate="animate"
          >
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-2xl">
                <Mic className="w-16 h-16 text-white" />
              </div>
              
              {/* Pulse Rings */}
              <div className="absolute inset-0 rounded-full border-4 border-blue-300 animate-ping opacity-20"></div>
              <div className="absolute inset-2 rounded-full border-4 border-purple-300 animate-ping opacity-30" style={{animationDelay: '1s'}}></div>
              <div className="absolute inset-4 rounded-full border-4 border-pink-300 animate-ping opacity-40" style={{animationDelay: '2s'}}></div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}; 