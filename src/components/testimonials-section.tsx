"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Quote, TrendingUp, Users, Award } from 'lucide-react';

export const TestimonialsSection: React.FC = () => {
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

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Training Manager",
      company: "Pacific Bistro Chain",
      industry: "Restaurant",
      avatar: "🍽️",
      rating: 5,
      testimonial: "Zyglio transformed our staff training. Voice-guided food safety protocols reduced training time by 60% while improving compliance scores to 98%.",
      metrics: {
        improvement: "60% faster training",
        metric: "98% compliance"
      }
    },
    {
      name: "Captain Mike Rodriguez",
      role: "Marine Engineer",
      company: "Gulf Coast Marine",
      industry: "Marine",
      avatar: "⚓",
      rating: 5,
      testimonial: "The voice-activated engine diagnostics training is game-changing. Our technicians can now identify issues 40% faster with 95% accuracy.",
      metrics: {
        improvement: "40% faster diagnosis",
        metric: "95% accuracy"
      }
    },
    {
      name: "Dr. Amanda Foster",
      role: "Chief Medical Officer",
      company: "Regional Health Network",
      industry: "Healthcare",
      avatar: "🏥",
      rating: 5,
      testimonial: "Voice AI training for medical procedures has standardized our protocols and reduced training errors by 75%. Patient safety has never been better.",
      metrics: {
        improvement: "75% fewer errors",
        metric: "99% safety score"
      }
    }
  ];

  const stats = [
    {
      icon: TrendingUp,
      value: "2.5M+",
      label: "Training Sessions",
      description: "Completed across all industries"
    },
    {
      icon: Users,
      value: "15K+",
      label: "Active Users",
      description: "Training professionals worldwide"
    },
    {
      icon: Award,
      value: "97%",
      label: "Success Rate",
      description: "Average certification pass rate"
    },
    {
      icon: Star,
      value: "4.9/5",
      label: "User Rating",
      description: "Across all industry platforms"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 to-white">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <Badge className="mb-4 bg-gradient-to-r from-green-600 to-blue-600 text-white px-4 py-2">
            Success Stories
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Transforming Training
            <br />
            <span className="text-green-600">Across Industries</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            See how organizations across different sectors are achieving remarkable results with Zyglio's voice AI training platform.
          </p>
        </motion.div>

        {/* Testimonials */}
        <motion.div 
          className="grid md:grid-cols-3 gap-8 mb-20"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {testimonials.map((testimonial, index) => (
            <motion.div key={testimonial.name} variants={itemVariants}>
              <Card className="h-full bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group relative overflow-hidden">
                {/* Quote Icon */}
                <div className="absolute top-4 right-4 text-slate-200 group-hover:text-slate-300 transition-colors">
                  <Quote className="w-8 h-8" />
                </div>
                
                <CardContent className="p-8">
                  {/* Industry Badge */}
                  <div className="flex items-center justify-between mb-6">
                    <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                      {testimonial.industry}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>

                  {/* Testimonial */}
                  <blockquote className="text-slate-700 mb-6 leading-relaxed">
                    "{testimonial.testimonial}"
                  </blockquote>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                      <div className="text-sm font-semibold text-green-600 mb-1">
                        {testimonial.metrics.improvement}
                      </div>
                      <div className="text-xs text-slate-600">Improvement</div>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                      <div className="text-sm font-semibold text-blue-600 mb-1">
                        {testimonial.metrics.metric}
                      </div>
                      <div className="text-xs text-slate-600">Achievement</div>
                    </div>
                  </div>

                  {/* Author */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-slate-200 to-slate-300 rounded-full flex items-center justify-center text-2xl">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{testimonial.name}</div>
                      <div className="text-sm text-slate-600">{testimonial.role}</div>
                      <div className="text-xs text-slate-500">{testimonial.company}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h3 className="text-3xl font-bold mb-4 text-slate-900">
            Platform Impact
          </h3>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Real numbers that demonstrate the transformative power of voice AI training across industries.
          </p>
        </motion.div>

        <motion.div 
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {stats.map((stat, index) => (
            <motion.div 
              key={stat.label}
              variants={itemVariants}
              className="text-center group"
            >
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <stat.icon className="w-10 h-10 text-white" />
              </div>
              <h4 className="text-3xl font-bold mb-2 text-slate-900">{stat.value}</h4>
              <div className="text-lg font-semibold text-slate-700 mb-1">{stat.label}</div>
              <p className="text-sm text-slate-500">{stat.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}; 