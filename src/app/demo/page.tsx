"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Mic, Brain, Zap } from "lucide-react";
import HumeVoiceChat from "@/components/hume-voice-chat";

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
              <Button variant="outline" className="text-purple-500 border-white hover:bg-white/10">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            AI Voice Interview Demo
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-4xl mx-auto leading-relaxed">
            Experience Zyglio's voice-to-mastery technology
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
                  Our AI analyzes your speech and emotions for more natural interactions
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-6 text-center">
                <Zap className="h-12 w-12 text-cyan-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Real-time Response</h3>
                <p className="text-blue-100 text-sm">
                  Get instant, emotionally aware responses from our advanced AI voice assistant
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-16 px-4">
        <HumeVoiceChat />
      </section>
    </div>
  );
};

export default LiveDemo; 