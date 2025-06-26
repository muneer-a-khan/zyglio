import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const audioBlob = formData.get('audioBlob') as Blob;
    const certificationId = formData.get('certificationId') as string;
    const scenarioId = formData.get('scenarioId') as string;
    const currentQuestion = formData.get('currentQuestion') as string;
    const previousResponsesStr = formData.get('previousResponses') as string;

    if (!audioBlob || !certificationId || !scenarioId) {
      return NextResponse.json(
        { error: 'Missing required data' },
        { status: 400 }
      );
    }

    const previousResponses = previousResponsesStr ? JSON.parse(previousResponsesStr) : [];

    console.log(`🎙️ Processing voice response for scenario: ${scenarioId}`);

    // Step 1: Transcribe the audio directly using OpenAI Whisper
    let transcription = '';
    try {
      // Convert Blob to Buffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Create a file object that OpenAI SDK can use
      const filename = `recording-${Date.now()}.wav`;
      const file = new File([buffer], filename, { type: audioBlob.type });

      // Use OpenAI Whisper API for transcription
      const transcriptionResult = await openai.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
        language: "en",
        response_format: "json",
      });

      transcription = transcriptionResult.text;
      console.log(`📝 Transcribed response: "${transcription}"`);
    } catch (transcriptionError) {
      console.error('Transcription error:', transcriptionError);
      return NextResponse.json(
        { error: 'Failed to transcribe audio' },
        { status: 500 }
      );
    }

    if (!transcription || transcription.trim().length === 0) {
      return NextResponse.json(
        { error: 'No speech detected in audio' },
        { status: 400 }
      );
    }

    // Step 2: Get certification data
    const certification = await prisma.certification.findUnique({
      where: { id: certificationId },
      include: {
        module: {
          include: {
            procedure: true
          }
        }
      }
    });

    if (!certification) {
      return NextResponse.json(
        { error: 'Certification not found' },
        { status: 404 }
      );
    }

    // Step 3: Get current scenario and questions from the certification data
    const voiceInterviewData = certification.voiceInterviewData as any;
    if (!voiceInterviewData || !voiceInterviewData.scenarios) {
      return NextResponse.json(
        { error: 'No scenarios found in certification' },
        { status: 400 }
      );
    }

    const scenario = voiceInterviewData.scenarios.find((s: any) => s.id === scenarioId);
    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }

    // Step 4: Score the response and get feedback using AI
    const scoringResponse = await fetch(new URL('/api/deepseek/score-response', process.env.NEXTAUTH_URL || 'http://localhost:3000').toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scenario,
        question: currentQuestion,
        response: transcription,
        previousResponses,
        moduleContent: certification.module.subtopics || [],
        currentQuestionNumber: (previousResponses.length + 1),
        maxQuestions: scenario.maxQuestions || 5
      }),
    });

    if (!scoringResponse.ok) {
      console.error('Failed to score response');
      // Fallback scoring if AI fails
      var scoringData = {
        responseScore: 3.5,
        competencyScores: {},
        feedback: "Thank you for your response.",
        isComplete: false
      };
    } else {
      var scoringData = await scoringResponse.json();
      console.log('🤖 AI Scoring Result:', {
        responseScore: scoringData.responseScore,
        isComplete: scoringData.isComplete,
        feedback: scoringData.feedback?.substring(0, 100) + '...'
      });
    }

    // Step 5: Determine if scenario is complete and calculate score
    const currentResponseCount = previousResponses.length + 1;
    const maxQuestions = scenario.maxQuestions || 5;
    
          // Enhanced scenario completion logic with 10-point progressive thresholds
      const aiSaysComplete = scoringData.isComplete === true;
      const maxQuestionsReached = currentResponseCount >= maxQuestions;
    
          // Calculate average score from all responses (10-point scale)
      const allScores = [...previousResponses.map(r => r.score), scoringData.responseScore];
      const averageScore = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
      
      // Progressive 10-point threshold completion criteria
      const progressiveThresholds = {
        1: 9.5, // After 1 question: 9.5+ = complete
        2: 8.5, // After 2 questions: 8.5+ = complete
        3: 7.0, // After 3 questions: 7.0+ = complete
        4: 6.0, // After 4 questions: 6.0+ = complete
        5: 5.0  // After 5+ questions: 5.0+ = complete
      };
      
      const requiredThreshold = progressiveThresholds[Math.min(currentResponseCount, 5) as keyof typeof progressiveThresholds];
      const meetsProgressiveThreshold = scoringData.responseScore >= requiredThreshold;
      
      const scenarioComplete = aiSaysComplete || maxQuestionsReached || meetsProgressiveThreshold;
    
    console.log('🎯 Scenario completion check:', {
      currentResponseCount,
      maxQuestions,
      responseScore: scoringData.responseScore,
      requiredThreshold,
      meetsProgressiveThreshold,
      aiSaysComplete,
      maxQuestionsReached,
      averageScore: averageScore.toFixed(1),
      finalDecision: scenarioComplete
    });

    let scenarioScore = null;
    if (scenarioComplete) {
      // Calculate average score for this scenario and convert to percentage
      const allResponses = [...previousResponses, { score: scoringData.responseScore }];
      const averageScore = allResponses.reduce((sum, r) => sum + r.score, 0) / allResponses.length;
      scenarioScore = Math.round((averageScore / 10) * 100); // Convert 1-10 scale to percentage
    }

    // Step 6: Get next question if scenario isn't complete
    let nextQuestion = null;
    let nextQuestionAudio = null;
    let comprehensivenessScore = 0;

    if (!scenarioComplete) {
      const nextQuestionResponse = await fetch(new URL('/api/certification/scenario-question', process.env.NEXTAUTH_URL || 'http://localhost:3000').toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenario,
          previousResponses: [...previousResponses, {
            question: currentQuestion,
            response: transcription,
            score: scoringData.responseScore,
            competencyScores: scoringData.competencyScores
          }],
          currentQuestionNumber: currentResponseCount + 1,
          moduleContent: certification.module.subtopics || []
        }),
      });

      if (nextQuestionResponse.ok) {
        const nextQuestionData = await nextQuestionResponse.json();
        nextQuestion = nextQuestionData.question;
        nextQuestionAudio = nextQuestionData.audioUrl;
        comprehensivenessScore = nextQuestionData.comprehensivenessScore || 0;
      }
    }

    // Step 7: Update certification data
    const updatedPreviousResponses = [...previousResponses, {
      question: currentQuestion,
      response: transcription,
      score: scoringData.responseScore,
      competencyScores: scoringData.competencyScores,
      timestamp: new Date().toISOString()
    }];

    // Update the scenario in the certification data
    const updatedScenarios = voiceInterviewData.scenarios.map((s: any) => {
      if (s.id === scenarioId) {
        return {
          ...s,
          responses: updatedPreviousResponses,
          completed: scenarioComplete,
          score: scenarioScore,
          completedAt: scenarioComplete ? new Date().toISOString() : null
        };
      }
      return s;
    });

    // Update certification
    await prisma.certification.update({
      where: { id: certificationId },
      data: {
        voiceInterviewData: {
          ...voiceInterviewData,
          scenarios: updatedScenarios,
          lastActivity: new Date().toISOString()
        }
      }
    });

    // Step 8: Log analytics
    await prisma.certificationAnalytics.create({
      data: {
        certificationId,
        userId: certification.userId,
        moduleId: certification.moduleId,
        eventType: 'VOICE_RESPONSE_SCORED',
        eventData: {
          scenarioId,
          scenarioTitle: scenario.title,
          question: currentQuestion.substring(0, 100) + "...",
          responsePreview: transcription.substring(0, 100) + "...",
          responseScore: scoringData.responseScore,
          competencyScores: scoringData.competencyScores,
          scenarioComplete,
          scenarioScore: scenarioComplete ? scenarioScore : null
        }
      }
    }).catch(() => {
      console.warn('Failed to log response analytics');
    });

    return NextResponse.json({
      success: true,
      transcription,
      responseScore: scoringData.responseScore,
      competencyScores: scoringData.competencyScores || {},
      comprehensivenessScore,
      scenarioComplete,
      scenarioScore: scenarioComplete ? scenarioScore : null,
      nextQuestion,
      nextQuestionAudio,
      feedback: scoringData.feedback,
      metadata: {
        currentResponseCount,
        maxQuestions,
        scenarioTitle: scenario.title
      }
    });

  } catch (error) {
    console.error('Error processing certification response:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process response',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 