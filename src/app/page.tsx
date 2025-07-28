'use client'

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  Mic, 
  Play, 
  BarChart3, 
  Users, 
  Zap,
  CheckCircle,
  Star,
  ChevronRight
} from "lucide-react";
import Footer from "@/components/Footer";
import DarkVeil from "@/components/dark-veil";
import SpotlightCard from "@/components/spotlight-card";
import ChromaGrid from "@/components/chroma-grid";

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const featureItems = [
  {
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=300&h=200&fit=crop",
    title: "Voice-Based Documentation",
    subtitle: "Capture procedures naturally using voice commands with AI enhancement",
    borderColor: "#3B82F6",
    gradient: "linear-gradient(145deg, #3B82F6, #000)",
    url: "/create"
  },
  {
    image: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=300&h=200&fit=crop",
    title: "Interactive Simulations",
    subtitle: "Automatically generate and run interactive procedural simulations",
    borderColor: "#10B981",
    gradient: "linear-gradient(180deg, #10B981, #000)",
    url: "/procedures"
  },
  {
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300&h=200&fit=crop",
    title: "Performance Analytics",
    subtitle: "Track progress and identify areas for improvement with detailed analytics",
    borderColor: "#F59E0B",
    gradient: "linear-gradient(165deg, #F59E0B, #000)",
    url: "/dashboard"
  },
  {
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300&h=200&fit=crop",
    title: "Team Collaboration",
    subtitle: "Share and collaborate on procedures with your team members",
    borderColor: "#8B5CF6",
    gradient: "linear-gradient(225deg, #8B5CF6, #000)",
    url: "/training"
  },
  {
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=300&h=200&fit=crop",
    title: "AI-Powered Insights",
    subtitle: "Get intelligent suggestions and optimizations for your procedures",
    borderColor: "#EF4444",
    gradient: "linear-gradient(195deg, #EF4444, #000)",
    url: "/certification"
  },
  {
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop",
    title: "Certification Ready",
    subtitle: "Prepare for certifications with our comprehensive training system",
    borderColor: "#06B6D4",
    gradient: "linear-gradient(135deg, #06B6D4, #000)",
    url: "/certification"
  }
];

const testimonials = [
  {
    name: "Dr. Sarah Chen",
    role: "Senior Technician",
    company: "Marine Engineering Corp",
    content: "Zyglio has revolutionized how we document our procedures. The voice interface is incredibly intuitive.",
    rating: 5
  },
  {
    name: "Mike Rodriguez",
    role: "Training Manager",
    company: "Gulf Coast Vessels",
    content: "The simulation features have made our training programs 3x more effective. Highly recommended!",
    rating: 5
  },
  {
    name: "Lisa Thompson",
    role: "Quality Assurance",
    company: "Offshore Solutions",
    content: "Finally, a platform that makes procedural documentation actually enjoyable and efficient.",
    rating: 5
  }
];

const stats = [
  { number: "500+", label: "Procedures Created", color: "rgba(0, 229, 255, 0.2)" },
  { number: "10k+", label: "Training Sessions", color: "rgba(147, 51, 234, 0.2)" },
  { number: "95%", label: "User Satisfaction", color: "rgba(59, 130, 246, 0.2)" },
  { number: "3x", label: "Faster Documentation", color: "rgba(34, 197, 94, 0.2)" }
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        {/* Dark Veil Background */}
        <div className="absolute inset-0">
          <DarkVeil 
            hueShift={11}
            noiseIntensity={0.02}
            scanlineIntensity={0.1}
            speed={0.7}
            scanlineFrequency={0.5}
            warpAmount={0.1}
            resolutionScale={1}
                  />
                </div>
        
        <div className="container relative px-4 mx-auto max-w-7xl">
          <motion.div 
            className="text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100/10 backdrop-blur-sm border border-blue-200/20 text-blue-100 text-sm font-medium mb-8"
            >
              <Star className="h-4 w-4 mr-2 fill-current" />
              Trusted by 500+ professionals worldwide
            </motion.div>
            
            <motion.h1 
              className="text-5xl lg:text-7xl font-bold tracking-tight text-white mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              Voice-Based
              <span className="block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Procedural Skills
              </span>
              Documentation
            </motion.h1>
            
            <motion.p 
              className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              Transform how you capture, refine, and simulate procedural tasks. 
              Our AI-powered platform makes documentation simple, effective, and engaging.
            </motion.p>
            
            <motion.div 
              className="flex justify-center items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6 rounded-xl border-2 border-white/20 hover:bg-white/10 transition-all duration-300 backdrop-blur-sm text-black">
                <Link href="/demo" className="flex items-center">
                  <Play className="mr-2 h-5 w-5" />
                  Live Demo
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-900">
        <div className="container px-4 mx-auto max-w-7xl">
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="text-center"
              >
                <SpotlightCard 
                  className="h-full flex flex-col justify-center items-center"
                  spotlightColor={stat.color}
                >
                  <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                    {stat.number}
              </div>
                  <div className="text-gray-300 font-medium">
                    {stat.label}
            </div>
                </SpotlightCard>
              </motion.div>
            ))}
          </motion.div>
          </div>
        </section>
        
      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container px-4 mx-auto max-w-7xl">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything you need to excel
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to streamline your procedural documentation workflow
            </p>
          </motion.div>
          
          <motion.div 
            className="h-[600px] relative"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <ChromaGrid 
              items={featureItems}
              radius={300}
              damping={0.45}
              fadeOut={0.6}
              ease="power3.out"
            />
          </motion.div>
            </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="container px-4 mx-auto max-w-7xl">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How it works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get started in three simple steps
            </p>
          </motion.div>
          
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              {
                step: "01",
                  title: "Define Your Task",
                  description: "Start by defining your procedure, including key performance indicators and objectives.",
                icon: "📝"
              },
              {
                step: "02", 
                  title: "Capture Voice Instructions",
                  description: "Use voice commands to record step-by-step procedures with our AI assistant enhancing your input.",
                icon: "🎤"
              },
              {
                step: "03",
                  title: "Visualize & Simulate",
                  description: "Automatically generate interactive flowcharts and simulations from your voice recordings.",
                icon: "🎯"
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="relative"
              >
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-100">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg mr-4">
                      {item.step}
                    </div>
                    <div className="text-4xl">{item.icon}</div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ChevronRight className="h-8 w-8 text-blue-300" />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="container px-4 mx-auto max-w-7xl">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Loved by professionals
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              See what our users are saying about Zyglio
            </p>
          </motion.div>
          
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100"
              >
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
              ))}
            </div>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  "{testimonial.content}"
                </p>
                <div>
                  <div className="font-semibold text-gray-900">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {testimonial.role} at {testimonial.company}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
          </div>
               </section>
       
       <Footer />
     </div>
   );
 }
