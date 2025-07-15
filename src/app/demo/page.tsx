"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Mic, Brain, Zap } from "lucide-react";
import VoiceInterviewDemo from "@/components/VoiceInterviewDemo";

const LiveDemo = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero Section */}
      <section className="relative pt-24 pb-12 px-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=1920&h=1080&fit=crop"
            alt="AI technology workspace representing voice interview system"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/85 via-purple-900/75 to-blue-900/85"></div>
        </div>
        <div className="relative z-20 max-w-7xl mx-auto text-center">
          <div className="mb-6">
            <Link href="/">
              <Button variant="outline" className="text-white border-white hover:bg-white/10">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Live Voice Interview Demo
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-4xl mx-auto leading-relaxed">
            Experience Zyglio's voice-to-mastery technology in action with our AI-powered interview assistant
          </p>
          
          {/* Feature Highlights */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-12">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-6 text-center">
                <Mic className="h-12 w-12 text-blue-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Voice Input</h3>
                <p className="text-blue-100 text-sm">
                  Speak naturally and watch your voice transform into structured learning experiences
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-6 text-center">
                <Brain className="h-12 w-12 text-purple-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">AI Processing</h3>
                <p className="text-blue-100 text-sm">
                  Advanced AI analyzes your speech and generates adaptive interview scenarios
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-6 text-center">
                <Zap className="h-12 w-12 text-cyan-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Real-time Response</h3>
                <p className="text-blue-100 text-sm">
                  Get instant, natural responses from our advanced AI voice assistant
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-16 px-4">
        <VoiceInterviewDemo />
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-6">
              How the Voice Interview System Works
            </h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              Zyglio's voice interview system demonstrates the power of converting speech into structured,
              interactive learning experiences using advanced AI technology.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎙️</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Voice Capture</h3>
              <p className="text-slate-600">
                Your voice is captured and processed in real-time using advanced speech recognition
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🧠</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Analysis</h3>
              <p className="text-slate-600">
                Our advanced AI processes your input and generates contextual, intelligent responses
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Adaptive Learning</h3>
              <p className="text-slate-600">
                The system adapts to your responses and creates personalized interview scenarios
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Performance Tracking</h3>
              <p className="text-slate-600">
                Your performance is analyzed to provide insights and improvement recommendations
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Training?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Experience the full power of Zyglio's voice-to-mastery platform with a personalized demo
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/create">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 text-lg">
                Create Your First Procedure
              </Button>
            </Link>
            <Link href="/training">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 px-8 py-3 text-lg">
                Explore Training
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LiveDemo; 