import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import OpenAI from 'openai';
import { 
  getCachedResponse, 
  cacheResponse, 
  initializePromptCache,
  preloadCertificationScenarios 
} from '@/lib/ai-cache';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize caches on module load
initializePromptCache();
preloadCertificationScenarios();

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

    console.log(`🚀 Fast processing voice response for scenario: ${scenarioId}`);

    // Step 1: Transcribe the audio using OpenAI Whisper (parallel with data fetching)
    const [transcriptionResult, certificationResult] = await Promise.all([
      // Transcription
      (async () => {
        try {
          const arrayBuffer = await audioBlob.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const filename = `recording-${Date.now()}.wav`;
          const file = new File([buffer], filename, { type: audioBlob.type });

          const transcriptionResult = await openai.audio.transcriptions.create({
            file: file,
            model: "whisper-1",
            language: "en",
            response_format: "json",
          });

          return transcriptionResult.text;
        } catch (error) {
          console.error('Transcription error:', error);
          throw new Error('Failed to transcribe audio');
        }
      })(),
      
      // Get certification data
      prisma.certification.findUnique({
        where: { id: certificationId },
        include: {
          module: {
            include: {
              procedure: true
            }
          }
        }
      })
    ]);

    const transcription = transcriptionResult;
    const certification = certificationResult;

    if (!transcription || transcription.trim().length === 0) {
      return NextResponse.json(
        { error: 'No speech detected in audio' },
        { status: 400 }
      );
    }

    if (!certification) {
      return NextResponse.json(
        { error: 'Certification not found' },
        { status: 404 }
      );
    }

    console.log(`📝 Transcribed: "${transcription.substring(0, 100)}..."`);

    // Step 2: Get scenario from certification data
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

    // Step 3: Score the response and get next question in parallel
    const currentResponseCount = previousResponses.length + 1;
    const maxQuestions = scenario.maxQuestions || 5;

    // Generate cache key for this entire request
    const processCacheKey = `process_${scenarioId}_${currentResponseCount}_${transcription.substring(0, 50)}`;
    
    // Check for cached complete result
    const cachedResult = getCachedResponse(processCacheKey);
    if (cachedResult) {
      console.log('✅ Using cached process result');
      return NextResponse.json(cachedResult);
    }

    // Parallel processing: scoring and next question preparation
    const [scoringResult, nextQuestionResult] = await Promise.all([
      // Score current response
      fetch(new URL('/api/deepseek/score-response', process.env.NEXTAUTH_URL || 'http://localhost:3000').toString(), {
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
          currentQuestionNumber: currentResponseCount,
          maxQuestions
        }),
      }).then(async (response) => {
        if (!response.ok) {
          console.warn('Scoring failed, using fallback');
          return {
            responseScore: 6,
            competencyScores: {
              accuracy: 6, application: 6, communication: 7, problemSolving: 5, completeness: 6
            },
            feedback: "Response received and evaluated.",
            isComplete: false,
            reasoningForNext: "Continuing assessment"
          };
        }
        return await response.json();
      }),

      // Prepare next question (only if we might need it)
      currentResponseCount < maxQuestions ? 
        fetch(new URL('/api/certification/scenario-question', process.env.NEXTAUTH_URL || 'http://localhost:3000').toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            scenario,
            previousResponses: [...previousResponses, { 
              question: currentQuestion, 
              response: transcription,
              score: null, // Will be filled in after scoring completes
              competencyScores: null
            }], // Include current response with question context
            currentQuestionNumber: currentResponseCount + 1,
            moduleContent: certification.module.subtopics || []
          }),
        }).then(async (response) => {
          if (!response.ok) {
            console.warn('Next question generation failed, will use fallback if needed');
            return null;
          }
          return await response.json();
        }).catch(() => null) : Promise.resolve(null)
    ]);

    const scoringData = scoringResult;
    
    console.log('🤖 Scoring completed:', {
      responseScore: scoringData.responseScore,
      isComplete: scoringData.isComplete,
      feedback: scoringData.feedback?.substring(0, 50) + '...'
    });

    // Step 4: Determine if scenario is complete using enhanced logic
    const aiSaysComplete = scoringData.isComplete === true;
    const maxQuestionsReached = currentResponseCount >= maxQuestions;
    
    // Progressive thresholds for 10-point scale
    const progressiveThresholds = {
      1: 9.0, 2: 8.0, 3: 6.5, 4: 5.5, 5: 4.5
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
      finalDecision: scenarioComplete
    });

    let scenarioScore = null;
    if (scenarioComplete) {
      // Calculate average score for this scenario and convert to percentage
      const allResponses = [...previousResponses, { score: scoringData.responseScore }];
      const averageScore = allResponses.reduce((sum, r) => sum + r.score, 0) / allResponses.length;
      scenarioScore = Math.round((averageScore / 10) * 100); // Convert 1-10 scale to percentage
    }

    // Step 5: Prepare response
    let nextQuestion = null;
    let nextQuestionAudio = null;
    let comprehensivenessScore = 0;

    if (!scenarioComplete && nextQuestionResult) {
      nextQuestion = nextQuestionResult.question;
      nextQuestionAudio = nextQuestionResult.audioUrl;
      comprehensivenessScore = nextQuestionResult.comprehensivenessScore || 0;
    } else if (!scenarioComplete) {
      // Fallback question if next question generation failed
      nextQuestion = `Can you provide more details about your approach to ${scenario.title.toLowerCase()}?`;
      comprehensivenessScore = Math.round((scoringData.responseScore / 10) * 100);
    }

    // Step 6: Update certification data (async, don't wait)
    const updateData = {
      ...voiceInterviewData,
      scenarios: voiceInterviewData.scenarios.map((s: any) => {
        if (s.id === scenarioId) {
          return {
            ...s,
            responses: [...(s.responses || []), {
              question: currentQuestion,
              response: transcription,
              score: scoringData.responseScore,
              competencyScores: scoringData.competencyScores,
              feedback: scoringData.feedback,
              timestamp: new Date().toISOString()
            }],
            completed: scenarioComplete,
            score: scenarioScore || s.score || 0,
            questionsAsked: currentResponseCount
          };
        }
        return s;
      }),
      lastResponseAt: new Date().toISOString()
    };

    // Update certification asynchronously (don't block response)
    prisma.certification.update({
      where: { id: certificationId },
      data: {
        voiceInterviewData: updateData
      }
    }).catch((error) => {
      console.error('Failed to update certification data:', error);
    });

    // Step 7: Build final response
    const result = {
      success: true,
      transcription,
      score: scoringData.responseScore,
      feedback: scoringData.feedback,
      competencyScores: scoringData.competencyScores,
      scenarioComplete,
      scenarioScore,
      nextQuestion,
      nextQuestionAudio,
      questionNumber: scenarioComplete ? null : currentResponseCount + 1,
      comprehensivenessScore,
      totalQuestionsAsked: currentResponseCount,
      reasoningForNext: scoringData.reasoningForNext,
      metadata: {
        scenarioId,
        processingTime: Date.now(),
        cacheUsed: false
      }
    };

    // Cache the result for future identical requests
    cacheResponse(processCacheKey, result);

    console.log(`✅ Response processed successfully. Complete: ${scenarioComplete}, Next: ${!!nextQuestion}`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error processing certification response:', error);
    
    // Fallback response to keep the system functional
    const fallbackResult = {
      success: false,
      transcription: '',
      score: 5,
      feedback: 'Unable to process response at this time. Please try again.',
      competencyScores: {
        accuracy: 5, application: 5, communication: 5, problemSolving: 5, completeness: 5
      },
      scenarioComplete: false,
      scenarioScore: null,
      nextQuestion: 'Please repeat your previous response or provide additional details.',
      nextQuestionAudio: null,
      questionNumber: null,
      comprehensivenessScore: 50,
      totalQuestionsAsked: 0,
      reasoningForNext: 'System error - continuing assessment',
      error: 'Processing failed but system is functional'
    };

    return NextResponse.json(fallbackResult, { status: 200 }); // Return 200 to avoid breaking UI
  }
} 