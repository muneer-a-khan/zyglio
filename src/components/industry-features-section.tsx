"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Mic, 
  Brain, 
  Award, 
  Clock, 
  Users, 
  Shield, 
  Utensils, 
  Anchor, 
  HeartHandshake,
  CheckCircle,
  Star,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export const IndustryFeaturesSection: React.FC = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6
      }
    }
  };

  const industries = [
    {
      title: "Restaurant Industry",
      icon: Utensils,
      color: "from-orange-500 to-red-500",
      description: "Train kitchen staff, servers, and managers with voice-guided procedures for food safety, customer service, and operational excellence.",
      features: [
        "Food safety protocols",
        "Customer service training",
        "Kitchen operations",
        "Staff certification"
      ],
      badge: "Live",
      stats: { users: "5K+", accuracy: "98%" }
    },
    {
      title: "Marine Industry",
      icon: Anchor,
      color: "from-blue-500 to-cyan-500",
      description: "Comprehensive training for marine technicians, engineers, and operators with voice-activated engine diagnostics and safety procedures.",
      features: [
        "Engine diagnostics",
        "Safety protocols",
        "Maintenance procedures",
        "Emergency response"
      ],
      badge: "Popular",
      stats: { users: "8K+", accuracy: "96%" }
    },
    {
      title: "Healthcare",
      icon: HeartHandshake,
      color: "from-green-500 to-emerald-500",
      description: "Voice-enabled medical training for procedures, patient care, and compliance with healthcare regulations and safety standards.",
      features: [
        "Medical procedures",
        "Patient care protocols",
        "Compliance training",
        "Emergency procedures"
      ],
      badge: "Growing",
      stats: { users: "2K+", accuracy: "99%" }
    }
  ];

  const coreFeatures = [
    {
      icon: Mic,
      title: "Voice Recognition",
      description: "Advanced speech-to-text with 99% accuracy across different accents and languages"
    },
    {
      icon: Brain,
      title: "AI-Powered Learning",
      description: "Adaptive learning paths that personalize based on individual progress and performance"
    },
    {
      icon: Award,
      title: "Certification Ready",
      description: "Industry-standard certifications with verified competency assessments"
    },
    {
      icon: Shield,
      title: "Compliance Tracking",
      description: "Automated compliance monitoring with detailed reporting and audit trails"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-white to-slate-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <Badge className="mb-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2">
            Multi-Industry Platform
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Voice AI Training
            <br />
            <span className="text-blue-600">Across Industries</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Zyglio's voice AI technology adapts to your industry's unique training needs, delivering personalized learning experiences that drive real results.
          </p>
        </motion.div>

        {/* Industry Cards */}
        <motion.div 
          className="grid md:grid-cols-3 gap-8 mb-20"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {industries.map((industry, index) => (
            <motion.div key={industry.title} variants={itemVariants}>
              <Card className="h-full bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group">
                <CardHeader className="relative">
                  <div className="absolute top-4 right-4">
                    <Badge className={`bg-gradient-to-r ${industry.color} text-white`}>
                      {industry.badge}
                    </Badge>
                  </div>
                  <div className={`w-16 h-16 bg-gradient-to-r ${industry.color} rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <industry.icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-slate-900 mb-2">
                    {industry.title}
                  </CardTitle>
                  <p className="text-slate-600 mb-4">{industry.description}</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2 mb-6">
                    {industry.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="flex justify-between items-center mb-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {industry.stats.users} users
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4" />
                      {industry.stats.accuracy} accuracy
                    </span>
                  </div>
                  
                  <Link href="/training">
                    <Button className="w-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white group">
                      Explore Training
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Core Features */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h3 className="text-3xl font-bold mb-4 text-slate-900">
            Core Platform Features
          </h3>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Powered by cutting-edge AI technology, Zyglio delivers consistent, high-quality training experiences across all industries.
          </p>
        </motion.div>

        <motion.div 
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {coreFeatures.map((feature, index) => (
            <motion.div 
              key={feature.title}
              variants={itemVariants}
              className="text-center group"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-semibold mb-2 text-slate-900">{feature.title}</h4>
              <p className="text-slate-600">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}; 