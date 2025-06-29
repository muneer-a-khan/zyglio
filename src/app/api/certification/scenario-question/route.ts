import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  getCachedResponse, 
  cacheResponse, 
  getCachedAudio,
  cacheAudio,
  getCachedPrompt
} from '@/lib/ai-cache';

export async function POST(request: NextRequest) {
  try {
    const { scenario, previousResponses, currentQuestionNumber, moduleContent } = await request.json();

    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario is required' },
        { status: 400 }
      );
    }

    console.log(`🚀 Scenario-specific question generation (Q${currentQuestionNumber}) for: ${scenario.title}`);

    // Generate cache key for question generation
    const questionCacheKey = `question_${scenario.id}_${currentQuestionNumber}_${previousResponses?.length || 0}`;
    
    // Check for cached question
    const cachedQuestion = getCachedResponse(questionCacheKey);
    if (cachedQuestion) {
      console.log('✅ Using cached question');
      return NextResponse.json(cachedQuestion);
    }

    // Analyze previous responses for weak areas
    const responseSummary = previousResponses?.map((r: any) => ({
      score: r.score,
      competencyScores: r.competencyScores,
      response: r.response, // Include full response for better follow-up questions
      question: r.question, // Include the question that was asked
      responsePreview: r.response?.substring(0, 100) + "..."
    })) || [];

    const averageScore = responseSummary.length > 0 
      ? responseSummary.reduce((sum: number, r: any) => sum + r.score, 0) / responseSummary.length
      : 0;

    // Identify focus area from competency scores
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

    const lowestCompetency = Object.entries(competencyAverages)
      .sort(([,a], [,b]) => a - b)[0];

    const focusArea = lowestCompetency?.[0] || 'application';

    // STAGE 1: Generate scenario-specific contextual questions
    let questionData = null;
    
    // Create contextual questions based on scenario and current question number
    if (currentQuestionNumber <= 2 || averageScore > 7) {
      console.log('🎯 Creating scenario-specific contextual question');
      
      const contextualQuestion = generateScenarioContextualQuestion(
        scenario,
        currentQuestionNumber,
        focusArea,
        responseSummary,
        averageScore
      );

      questionData = contextualQuestion;
    }

    // STAGE 2: Use AI for complex adaptive questions when templates aren't sufficient
    if (!questionData) {
      console.log('🤖 Using AI for complex scenario-specific question');
      
      try {
        // Enhanced prompt that includes full scenario context
        const enhancedPrompt = `
You are conducting a professional certification interview. Generate a specific question based on this scenario:

SCENARIO CONTEXT:
Title: ${scenario.title}
Description: ${scenario.description}
Detailed Context: ${scenario.context}
Expected Competencies: ${scenario.expectedCompetencies?.join(', ') || 'Professional application'}

INTERVIEW PROGRESS:
- Question Number: ${currentQuestionNumber}
- Previous Responses: ${responseSummary.length}
- Average Score: ${averageScore.toFixed(1)}/10
- Focus Area (weakest): ${focusArea}

PREVIOUS RESPONSES ANALYSIS:
${responseSummary.length > 0 ? responseSummary.map((r, i) => `
Response ${i+1} (Score: ${r.score}/10):
Question: "${r.question || 'Previous question'}"
Full Response: "${r.response || r.responsePreview}"
Competency Scores: ${r.competencyScores ? Object.entries(r.competencyScores).map(([k,v]) => `${k}: ${v}`).join(', ') : 'N/A'}
`).join('\n') : 'No previous responses - this is the first question'}

BUILD FOLLOW-UP BASED ON PREVIOUS RESPONSES:
${currentQuestionNumber > 1 ? `
The candidate previously said: "${responseSummary[responseSummary.length - 1]?.response || responseSummary[responseSummary.length - 1]?.responsePreview}"

Your next question should:
- Reference specific points they mentioned
- Ask them to elaborate on their approach
- Probe deeper into their reasoning
- Challenge or build upon their stated strategy
- Test their understanding of consequences or next steps
` : 'This is the first question - set the scenario scene'}

INSTRUCTIONS:
Create a specific question that:
1. Directly references the scenario context and situation
2. Tests ${focusArea} competency specifically  
3. Guides the candidate through the scenario step-by-step
4. Asks for specific actions, decisions, or explanations
5. Is practical and scenario-specific (not generic)

${currentQuestionNumber === 1 ? 
  'For Question 1: Start by setting the scene and asking about their initial approach or assessment of the situation.' :
  currentQuestionNumber === 2 ?
  'For Question 2: Based on their first response, dig deeper into specific steps, safety considerations, or procedures.' :
  'For later questions: Focus on problem-solving, edge cases, or advanced applications within this scenario.'
}

Return ONLY valid JSON: {"question": "Your specific scenario-based question", "reasoning": "Why this question tests the scenario context and competency"}`;

        const questionResponse = await fetch(new URL('/api/deepseek/scenario-adaptive-question', process.env.NEXTAUTH_URL || 'http://localhost:3000').toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: enhancedPrompt,
            scenario,
            previousResponses: responseSummary,
            currentQuestionNumber,
            averageScore,
            lowestCompetency: focusArea,
            moduleContent: moduleContent || []
          }),
        });

        if (questionResponse.ok) {
          const data = await questionResponse.json();
          questionData = data;
        }
      } catch (error) {
        console.warn('AI question generation failed, using contextual fallback');
      }
    }

    // STAGE 3: Enhanced fallback with scenario context
    if (!questionData) {
      questionData = generateEnhancedFallbackQuestion(scenario, currentQuestionNumber, focusArea);
    }

    // STAGE 4: Audio generation with caching
    let audioUrl = null;
    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
    
    if (elevenlabsApiKey && questionData.question) {
      // Check for cached audio first
      const cachedAudioUrl = getCachedAudio(questionData.question);
      
      if (cachedAudioUrl) {
        console.log('✅ Using cached audio');
        audioUrl = cachedAudioUrl;
      } else {
        console.log('🔊 Generating new audio');
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
              model_id: 'eleven_flash_v2_5',
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
            const base64Audio = Buffer.from(audioBuffer).toString('base64');
            audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
            
            // Cache the audio for future use
            cacheAudio(questionData.question, audioUrl);
            console.log('🎵 Audio generated and cached');
          } else {
            console.warn('ElevenLabs TTS failed, continuing without audio');
          }
        } catch (error) {
          console.warn('Audio generation failed:', error);
        }
      }
    }

    // Calculate comprehensiveness score based on previous responses
    const comprehensivenessScore = Math.round((averageScore / 10) * 100);

    const result = {
      question: questionData.question,
      audioUrl,
      questionNumber: currentQuestionNumber,
      focusArea: questionData.focusArea || focusArea,
      comprehensivenessScore,
      adaptiveReasoning: questionData.reasoning,
      metadata: {
        scenarioTitle: scenario.title,
        scenarioContext: scenario.context?.substring(0, 200) + '...',
        averageScore,
        competencyFocus: focusArea,
        previousResponseCount: previousResponses?.length || 0,
        generationMethod: questionData.reasoning?.includes('contextual') ? 'contextual' : 'ai'
      }
    };

    // Cache the result
    cacheResponse(questionCacheKey, result);

    console.log(`✅ Scenario-specific question generated (${result.metadata.generationMethod}) focusing on: ${focusArea}`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error generating scenario question:', error);
    
    // Enhanced fallback with scenario context
    const fallbackResult = {
      question: `Based on the scenario where ${scenario?.context || scenario?.description || 'you are in a professional situation'}, what would be your first priority and why?`,
      audioUrl: null,
      questionNumber: currentQuestionNumber,
      focusArea: 'general',
      comprehensivenessScore: 50,
      adaptiveReasoning: "Enhanced fallback question with scenario context",
      metadata: {
        scenarioTitle: scenario?.title || 'Unknown',
        scenarioContext: scenario?.context?.substring(0, 200) + '...' || 'Context unavailable',
        averageScore: 5,
        competencyFocus: 'general',
        previousResponseCount: previousResponses?.length || 0,
        generationMethod: 'fallback'
      }
    };
    
    return NextResponse.json(fallbackResult);
  }
}

// Generate scenario-specific contextual questions
function generateScenarioContextualQuestion(scenario: any, questionNumber: number, focusArea: string, previousResponses: any[], averageScore: number) {
  const context = scenario.context || scenario.description || scenario.title;
  const competencies = scenario.expectedCompetencies || [];
  
  // Question templates that incorporate the specific scenario context
  const contextualQuestions = {
    1: {
      safety: `Given this scenario: "${context}" - What are the first safety considerations you would assess, and what initial steps would you take to ensure a safe working environment?`,
      application: `In this situation: "${context}" - Walk me through your initial assessment and the first actions you would take. What key factors would guide your approach?`,
      communication: `Considering this scenario: "${context}" - How would you explain the situation to a colleague, and what key information would you communicate first?`,
      problemSolving: `In this scenario: "${context}" - What potential challenges do you anticipate, and how would you prepare to address them?`,
      completeness: `Given this context: "${context}" - What information would you need to gather before proceeding, and what factors would you consider?`
    },
    2: {
      safety: `Continuing with your approach to this scenario, what specific safety protocols would you implement at each step, and how would you monitor for potential hazards?`,
      application: `Now that you've outlined your initial approach, can you detail the specific techniques or procedures you would use to handle this situation effectively?`,
      communication: `How would you coordinate with others in this scenario? What communication protocols would you establish to ensure everyone is informed?`,
      problemSolving: `If complications arose during this scenario, what would be your troubleshooting process? Walk me through how you would identify and resolve issues.`,
      completeness: `What additional considerations or contingency plans would you have for this scenario? How would you ensure nothing important is overlooked?`
    },
    3: {
      safety: `Describe how you would handle a safety emergency in this scenario. What protocols would you follow and what resources would you utilize?`,
      application: `Demonstrate your mastery by explaining how you would teach someone else to handle this scenario. What key points would you emphasize?`,
      communication: `How would you document this scenario and communicate the outcomes to stakeholders? What information would be most critical to share?`,
      problemSolving: `What are the most challenging aspects of this scenario, and how would you develop strategies to overcome them consistently?`,
      completeness: `Looking at this scenario holistically, how does it connect to broader principles and practices in your field? What insights would you share?`
    }
  };

  const questionSet = contextualQuestions[Math.min(questionNumber, 3) as keyof typeof contextualQuestions];
  const question = questionSet[focusArea as keyof typeof questionSet] || questionSet.application;

  return {
    question,
    reasoning: `Contextual question ${questionNumber} for scenario "${scenario.title}" focusing on ${focusArea} competency`,
    focusArea
  };
}

// Enhanced fallback that uses scenario context
function generateEnhancedFallbackQuestion(scenario: any, questionNumber: number, focusArea: string) {
  const context = scenario.context || scenario.description || scenario.title;
  
  const fallbackQuestions = {
    1: `In the scenario where ${context.toLowerCase()}, what would be your primary objectives and how would you prioritize your actions?`,
    2: `Continuing with this scenario, what specific steps would you take to ensure successful completion? Please walk me through your process.`,
    3: `Looking at potential challenges in this scenario, how would you adapt your approach if circumstances changed? What contingencies would you consider?`
  };

  const question = fallbackQuestions[Math.min(questionNumber, 3) as keyof typeof fallbackQuestions] || 
    `Based on this scenario: ${context}, how would you apply your expertise to achieve the best outcomes?`;

  return {
    question,
    reasoning: `Enhanced fallback question for ${scenario.title} focusing on practical application`,
    focusArea: 'application'
  };
} 