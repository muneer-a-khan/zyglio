import { NextRequest, NextResponse } from 'next/server';
import { getDeepSeekApi } from '@/lib/deepseek';
import { getCachedScoringResult, cacheScoringResult, getTemplateScore, shouldUseTemplateScoring } from '@/lib/ai-cache';

export async function POST(request: NextRequest) {
  try {
    const { 
      scenario, 
      question, 
      response, 
      previousResponses, 
      moduleContent, 
      currentQuestionNumber, 
      maxQuestions 
    } = await request.json();

    if (!scenario || !question || !response) {
      return NextResponse.json(
        { error: 'Scenario, question, and response are required' },
        { status: 400 }
      );
    }

    console.log(`🎯 Scenario-aware scoring for Q${currentQuestionNumber}: ${scenario.title}`);

    // Generate cache key including scenario context
    const cacheKey = `score_${scenario.id}_${currentQuestionNumber}_${response.substring(0, 50).replace(/\s+/g, '_')}`;
    
    // Check cache first
    const cachedResult = getCachedScoringResult(cacheKey);
    if (cachedResult) {
      console.log('✅ Using cached scoring result');
      return NextResponse.json(cachedResult);
    }

    const deepseek = getDeepSeekApi();

    // STAGE 1: Quick template scoring for very short responses or clear cases
    if (shouldUseTemplateScoring(response, currentQuestionNumber)) {
      console.log('⚡ Using template-based scoring');
      
      const templateResult = getTemplateScore(response, scenario.expectedCompetencies);
      if (templateResult) {
        console.log(`🎯 Template scoring result: ${templateResult.responseScore}/10 for response: "${response.substring(0, 50)}..."`);
        cacheScoringResult(cacheKey, templateResult);
        return NextResponse.json(templateResult);
      }
    }

    // STAGE 2: Enhanced AI scoring with full scenario context
    console.log('🤖 Using AI for detailed scenario-aware scoring');

    const enhancedScoringPrompt = `
You are evaluating a certification response within a specific scenario context. Provide detailed, constructive scoring.

SCENARIO CONTEXT:
Title: ${scenario.title}
Description: ${scenario.description || 'Not provided'}
Detailed Context: ${scenario.context || 'Not provided'}
Expected Competencies: ${scenario.expectedCompetencies?.join(', ') || 'Professional skills'}

QUESTION ASKED:
"${question}"

CANDIDATE'S RESPONSE:
"${response}"

EVALUATION CONTEXT:
- Question Number: ${currentQuestionNumber} of ${maxQuestions}
- Previous Responses: ${previousResponses?.length || 0}
- Average Previous Score: ${previousResponses?.length > 0 ? 
  (previousResponses.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / previousResponses.length).toFixed(1) : 'N/A'}

SCORING CRITERIA (1-10 scale):
1. ACCURACY (25%): Technical correctness and factual accuracy within the scenario context
2. APPLICATION (25%): How well they apply knowledge to this specific scenario
3. COMMUNICATION (20%): Clarity, structure, and completeness of explanation
4. PROBLEM-SOLVING (20%): Critical thinking and approach to scenario challenges
5. COMPLETENESS (10%): Coverage of important aspects relevant to the scenario

EVALUATION GUIDELINES:
- Consider the response within the specific scenario context provided
- Evaluate how well they understand and address the scenario situation
- Look for scenario-specific safety, procedural, or technical considerations
- Assess practical application rather than just theoretical knowledge
- Consider the question's intent and what competency it was testing

COMPLETION CRITERIA:
- Response is complete if score ≥ 8.0 AND demonstrates comprehensive understanding
- Response is complete if this is question ${maxQuestions} regardless of score
- Response is complete if candidate shows mastery of all key scenario elements

Return ONLY valid JSON with this exact structure:
{
  "responseScore": 7.5,
  "competencyScores": {
    "accuracy": 8,
    "application": 7,
    "communication": 8,
    "problemSolving": 6,
    "completeness": 7
  },
  "feedback": "Specific constructive feedback addressing the scenario context and response quality. Mention what was done well and areas for improvement within this scenario.",
  "isComplete": false,
  "reasoningForNext": "Brief explanation of why questioning should continue or stop, based on response quality and scenario coverage",
  "scenarioSpecificNotes": "Any observations specific to how well they handled this particular scenario context"
}`;

    try {
      const completion = await deepseek.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "You are an expert certification evaluator. Provide thorough, fair, and constructive scoring. Always return valid JSON. Focus on practical application and scenario-specific competency."
          },
          {
            role: "user",
            content: enhancedScoringPrompt
          }
        ],
        temperature: 0.3, // Moderate temperature for more natural variation while maintaining accuracy
        max_tokens: 800 // Increased for detailed feedback
      });

      const aiResponse = completion.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('No response from DeepSeek API');
      }

      // Parse and validate response
      let scoringData: any;
      try {
        const cleanedResponse = aiResponse
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();
        
        scoringData = JSON.parse(cleanedResponse);
        
        // Validate required fields
        if (typeof scoringData.responseScore !== 'number' || 
            !scoringData.competencyScores || 
            !scoringData.feedback) {
          throw new Error('Invalid scoring data structure');
        }

        // Ensure score is within valid range
        scoringData.responseScore = Math.max(1, Math.min(10, scoringData.responseScore));
        
        // Validate competency scores
        Object.keys(scoringData.competencyScores).forEach(key => {
          scoringData.competencyScores[key] = Math.max(1, Math.min(10, scoringData.competencyScores[key]));
        });

      } catch (parseError) {
        console.warn('Failed to parse AI scoring response, using enhanced fallback');
        
        // Enhanced fallback scoring based on response analysis
        scoringData = generateEnhancedFallbackScoring(
          response, 
          scenario, 
          question, 
          currentQuestionNumber, 
          maxQuestions
        );
      }

      // Cache the result
      cacheScoringResult(cacheKey, scoringData);

      console.log(`🤖 AI scoring result: ${scoringData.responseScore}/10 for response: "${response.substring(0, 50)}..."`);

      return NextResponse.json(scoringData);

    } catch (error) {
      console.error('Error in AI scoring:', error);
      
      // Comprehensive fallback
      const fallbackResult = generateEnhancedFallbackScoring(
        response, 
        scenario, 
        question, 
        currentQuestionNumber, 
        maxQuestions
      );

      console.log(`🔄 Fallback scoring result: ${fallbackResult.responseScore}/10 for response: "${response.substring(0, 50)}..."`);
      return NextResponse.json(fallbackResult);
    }

  } catch (error) {
    console.error('Error in score-response API:', error);
    
    return NextResponse.json({
      responseScore: 5,
      competencyScores: {
        accuracy: 5, application: 5, communication: 5, problemSolving: 5, completeness: 5
      },
      feedback: "Unable to properly evaluate response due to system error. Please try again.",
      isComplete: false,
      reasoningForNext: "System error occurred during scoring",
      scenarioSpecificNotes: "Evaluation could not be completed"
    });
  }
}

// Enhanced fallback scoring that considers scenario context
function generateEnhancedFallbackScoring(
  response: string, 
  scenario: any, 
  question: string, 
  currentQuestionNumber: number, 
  maxQuestions: number
) {
  const responseLength = response.trim().length;
  const wordCount = response.trim().split(/\s+/).length;
  const lowercaseResponse = response.toLowerCase().trim();
  
  // Add randomization for more natural scoring (±0.3)
  const randomVariation = () => (Math.random() - 0.5) * 0.6;
  
  // Detect poor responses
  const poorResponses = [
    "i don't know", "i have no idea", "no idea", "not sure", "don't know",
    "i'm not sure", "no clue", "can't say", "unsure", "i wouldn't know",
    "i don't", "idk", "dunno", "no", "nope", "nothing", "n/a"
  ];
  
  const isPoorResponse = poorResponses.some(poor => 
    lowercaseResponse.includes(poor) || lowercaseResponse === poor
  );
  
  // Use generic indicators of thoughtful responses (works for any topic)
  const hasStructuredThinking = /\b(first|then|next|finally|step|approach|method|process)\b/.test(lowercaseResponse);
  const hasReasoningLanguage = /\b(because|since|reason|so|therefore|due to|in order to|as a result)\b/.test(lowercaseResponse);
  const hasConditionalThinking = /\b(if|when|would|could|should|might|may|depending on)\b/.test(lowercaseResponse);
  const hasActionOrientation = /\b(try|attempt|consider|ensure|check|verify|assess|evaluate|analyze)\b/.test(lowercaseResponse);
  
  // Count different types of thoughtful indicators
  let thoughtfulnessScore = 0;
  if (hasStructuredThinking) thoughtfulnessScore += 1;
  if (hasReasoningLanguage) thoughtfulnessScore += 1;
  if (hasConditionalThinking) thoughtfulnessScore += 1;
  if (hasActionOrientation) thoughtfulnessScore += 1;
  
  // Start with base score focused on demonstrated thinking quality
  let baseScore;
  if (isPoorResponse && thoughtfulnessScore === 0) {
    baseScore = 1.5; // Clearly doesn't know and shows no thinking
  } else if (thoughtfulnessScore >= 3) {
    baseScore = 5.5; // Shows multiple types of thoughtful analysis
  } else if (thoughtfulnessScore === 2) {
    baseScore = 4.0; // Shows good thinking in multiple areas
  } else if (thoughtfulnessScore === 1) {
    baseScore = 3.0; // Shows some thoughtful consideration
  } else {
    baseScore = 2.5; // Basic response without clear thinking indicators
  }
  
  // Minor adjustments for communication completeness
  if (wordCount >= 25) baseScore += 0.4; // Small bonus for thorough explanation
  else if (wordCount < 4) baseScore -= 1.0; // Penalty for extremely brief
  
  // Additional penalty only for truly poor responses
  if (isPoorResponse && thoughtfulnessScore === 0) {
    baseScore -= 1.0; // Additional penalty for completely unhelpful responses
  }

  // Scenario relevance analysis (focus on meaningful connections)
  const scenarioKeywords = [
    ...(scenario.title?.toLowerCase().split(' ') || []),
    ...(scenario.expectedCompetencies?.join(' ').toLowerCase().split(' ') || [])
  ].filter(word => word.length > 3); // Only meaningful words
  
  const responseWords = response.toLowerCase().split(/\s+/);
  const relevantMatches = scenarioKeywords.filter(keyword => 
    responseWords.some(word => word.includes(keyword))
  ).length;
  
  // Reward scenario relevance but don't heavily penalize lack of specific keywords
  if (relevantMatches >= 2) baseScore += 0.8;
  else if (relevantMatches >= 1) baseScore += 0.4;
  
  // Structure and reasoning indicators (already analyzed above, minor bonus)
  if (hasActionOrientation && hasReasoningLanguage) {
    baseScore += 0.3; // Small bonus for combining action and reasoning
  }

  // Apply randomization
  baseScore += randomVariation();

  // Ensure score is within bounds - much stricter range
  const finalScore = Math.max(1, Math.min(8.5, baseScore));

  // Generate competency scores based on response characteristics with more variation
  const competencyScores = {
    accuracy: Math.max(1, Math.min(8, finalScore - 0.3 + (relevantMatches * 0.3) + randomVariation())),
    application: Math.max(1, Math.min(8, finalScore + (hasActionOrientation ? 0.8 : -0.5) + randomVariation())),
    communication: Math.max(1, Math.min(8, finalScore + (wordCount > 15 ? 0.4 : -0.3) + randomVariation())),
    problemSolving: Math.max(1, Math.min(8, finalScore + (hasConditionalThinking ? 0.6 : -0.3) + randomVariation())),
    completeness: Math.max(1, Math.min(8, finalScore + (hasStructuredThinking ? 0.5 : -0.4) + randomVariation()))
  };

  // Determine completion based on enhanced criteria
  const isComplete = finalScore >= 8 || 
                    currentQuestionNumber >= maxQuestions || 
                    (finalScore >= 7 && wordCount >= 60);

  // Generate contextual feedback with more variation
  const feedbackOptions = {
    excellent: [
      "Excellent response demonstrating strong competency.",
      "Outstanding understanding and application.",
      "Very comprehensive and well-reasoned response."
    ],
    good: [
      "Good response showing solid understanding.",
      "Your approach demonstrates competency.",
      "Well-structured response with good reasoning."
    ],
    adequate: [
      "Your response shows basic understanding but needs development.",
      "Adequate response, but could be more detailed.",
      "You're on the right track but need more specificity."
    ],
    poor: [
      "Your response needs significant improvement.",
      "This response doesn't demonstrate the required competency.",
      "Much more detail and specific knowledge is needed."
    ],
    veryPoor: [
      "This response is insufficient for certification purposes.",
      "Your response indicates a lack of understanding.",
      "Substantial improvement needed to meet competency standards."
    ]
  };

  let feedbackCategory = 'poor';
  if (finalScore >= 7.5) feedbackCategory = 'excellent';
  else if (finalScore >= 6.0) feedbackCategory = 'good';
  else if (finalScore >= 4.0) feedbackCategory = 'adequate';
  else if (finalScore >= 2.0) feedbackCategory = 'poor';
  else feedbackCategory = 'veryPoor';

  let feedback = feedbackOptions[feedbackCategory as keyof typeof feedbackOptions][Math.floor(Math.random() * feedbackOptions[feedbackCategory as keyof typeof feedbackOptions].length)];
  
  // Add specific improvement suggestions
  if (isPoorResponse) {
    feedback += " Instead of expressing uncertainty, try to work through what you do know or what logical steps you might take.";
  } else if (wordCount < 15) {
    feedback += " Consider providing much more detailed explanations of your approach and reasoning.";
  } else if (relevantMatches < 2) {
    feedback += ` Try to more specifically address the scenario context: "${scenario.title}".`;
  }
  
  if (finalScore < 5) {
    const improvements = [
      " Focus on demonstrating practical knowledge and specific procedures.",
      " Explain your step-by-step approach in detail.",
      " Show understanding of safety considerations and best practices.",
      " Provide concrete examples of how you would handle the situation."
    ];
    feedback += improvements[Math.floor(Math.random() * improvements.length)];
  }

  return {
    responseScore: Math.round(finalScore * 10) / 10,
    competencyScores: Object.fromEntries(
      Object.entries(competencyScores).map(([k, v]) => [k, Math.round(v * 10) / 10])
    ),
    feedback,
    isComplete,
    reasoningForNext: isComplete ? 
      "Response demonstrates sufficient competency for this scenario" : 
      "Additional questions needed to fully assess scenario competency",
    scenarioSpecificNotes: `Fallback evaluation based on response length (${wordCount} words), scenario relevance (${relevantMatches} keywords), and structure analysis`
  };
} 