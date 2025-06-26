import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { scenario, previousResponses, currentQuestionNumber, moduleContent } = await request.json();

    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario is required' },
        { status: 400 }
      );
    }

    console.log(`🤔 Generating adaptive question ${currentQuestionNumber} for scenario: ${scenario.title}`);

    // Analyze previous responses to determine question focus
    const responseSummary = previousResponses?.map((r: any) => ({
      score: r.score,
      competencyScores: r.competencyScores,
      responsePreview: r.response?.substring(0, 100) + "..."
    })) || [];

    // Calculate average scores to identify weak areas (10-point scale)
    const averageScore = responseSummary.length > 0 
      ? responseSummary.reduce((sum: number, r: any) => sum + r.score, 0) / responseSummary.length
      : 0;

    // Identify areas needing improvement from competency scores
    const competencyAverages = {
      accuracy: 0,
      application: 0,
      communication: 0,
      problemSolving: 0,
      completeness: 0
    };

    if (responseSummary.length > 0) {
      Object.keys(competencyAverages).forEach(competency => {
        const scores = responseSummary
          .map((r: any) => r.competencyScores?.[competency] || 5)
          .filter(score => score > 0);
        competencyAverages[competency] = scores.length > 0 
          ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
          : 5;
      });
    }

    // Find the lowest scoring competency to focus the next question
    const lowestCompetency = Object.entries(competencyAverages)
      .sort(([,a], [,b]) => a - b)[0];

    const comprehensivenessScore = Math.round(averageScore * 10); // Convert 10-point scale to percentage

    // Generate adaptive question using AI
    const questionResponse = await fetch(new URL('/api/deepseek/scenario-adaptive-question', process.env.NEXTAUTH_URL || 'http://localhost:3000').toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scenario,
        previousResponses: responseSummary,
        currentQuestionNumber,
        averageScore,
        lowestCompetency: lowestCompetency?.[0] || 'application',
        moduleContent: moduleContent || []
      }),
    });

    if (!questionResponse.ok) {
      throw new Error('Failed to generate adaptive question');
    }

    const questionData = await questionResponse.json();

    // Generate audio for the question using ElevenLabs directly
    let audioUrl = null;
    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
    
    if (elevenlabsApiKey && questionData.question) {
      try {
        const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL`, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': elevenlabsApiKey
          },
          body: JSON.stringify({
            text: questionData.question,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
              style: 0,
              use_speaker_boost: true
            }
          })
        });

        if (ttsResponse.ok) {
          const audioBuffer = await ttsResponse.arrayBuffer();
          
          // Convert to base64 data URL for direct playback
          const base64Audio = Buffer.from(audioBuffer).toString('base64');
          audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
          
          console.log('🔊 Generated audio for question');
        } else {
          console.warn('ElevenLabs TTS failed:', await ttsResponse.text());
        }
      } catch (error) {
        console.warn('Failed to generate audio for question:', error);
        // Continue without audio
      }
    }

    console.log(`✅ Generated adaptive question focusing on: ${lowestCompetency?.[0] || 'general'}`);

    return NextResponse.json({
      question: questionData.question,
      audioUrl, // Now includes actual audio URL
      questionNumber: currentQuestionNumber,
      focusArea: lowestCompetency?.[0] || 'application',
      comprehensivenessScore,
      adaptiveReasoning: questionData.reasoning,
      metadata: {
        scenarioTitle: scenario.title,
        averageScore,
        competencyFocus: lowestCompetency?.[0],
        previousResponseCount: previousResponses?.length || 0
      }
    });

  } catch (error) {
    console.error('Error generating scenario question:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate question',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 