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
        temperature: 0.1, // Low temperature for consistent scoring
        max_tokens: 800 // Increased for detailed feedback
      });

      const aiResponse = completion.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('No response from DeepSeek API');
      }

      // Parse and validate response
      let scoringData;
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

      console.log(`✅ Scenario-aware scoring completed: ${scoringData.responseScore}/10`);

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
  
  // Base scoring on response quality indicators
  let baseScore = 5;
  
  // Length and detail assessment
  if (wordCount >= 50 && responseLength >= 200) baseScore += 1.5;
  else if (wordCount >= 20 && responseLength >= 100) baseScore += 0.5;
  else if (wordCount < 10) baseScore -= 1.5;

  // Scenario-relevant keyword analysis
  const scenarioKeywords = [
    ...(scenario.title?.toLowerCase().split(' ') || []),
    ...(scenario.expectedCompetencies?.join(' ').toLowerCase().split(' ') || []),
    'safety', 'procedure', 'step', 'process', 'consider', 'ensure', 'check'
  ];
  
  const responseWords = response.toLowerCase().split(/\s+/);
  const keywordMatches = scenarioKeywords.filter(keyword => 
    responseWords.some(word => word.includes(keyword))
  ).length;
  
  if (keywordMatches >= 3) baseScore += 1;
  else if (keywordMatches >= 1) baseScore += 0.5;

  // Structure and detail indicators
  if (response.includes('first') || response.includes('then') || response.includes('next')) {
    baseScore += 0.5; // Shows structured thinking
  }
  
  if (response.includes('because') || response.includes('since') || response.includes('reason')) {
    baseScore += 0.5; // Shows reasoning
  }

  // Ensure score is within bounds
  const finalScore = Math.max(2, Math.min(9, baseScore));

  // Generate competency scores based on response characteristics
  const competencyScores = {
    accuracy: Math.max(3, Math.min(8, finalScore - 0.5 + (keywordMatches * 0.2))),
    application: Math.max(3, Math.min(8, finalScore + (responseLength > 150 ? 0.5 : -0.5))),
    communication: Math.max(3, Math.min(8, finalScore + (wordCount > 30 ? 0.5 : -0.5))),
    problemSolving: Math.max(3, Math.min(8, finalScore + (response.includes('would') || response.includes('could') ? 0.5 : 0))),
    completeness: Math.max(3, Math.min(8, finalScore + (wordCount > 40 ? 0.5 : -0.5)))
  };

  // Determine completion based on enhanced criteria
  const isComplete = finalScore >= 8 || 
                    currentQuestionNumber >= maxQuestions || 
                    (finalScore >= 7 && wordCount >= 60);

  // Generate contextual feedback
  let feedback = `Your response shows ${finalScore >= 7 ? 'good' : finalScore >= 5 ? 'adequate' : 'developing'} understanding of the scenario. `;
  
  if (wordCount < 20) {
    feedback += "Consider providing more detailed explanations of your approach. ";
  }
  
  if (keywordMatches < 2) {
    feedback += `Try to more specifically address the scenario context: "${scenario.title}". `;
  }
  
  if (finalScore >= 7) {
    feedback += "You demonstrate solid practical thinking for this scenario.";
  } else {
    feedback += "Focus on explaining your specific steps and reasoning within this scenario context.";
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
    scenarioSpecificNotes: `Fallback evaluation based on response length (${wordCount} words), scenario relevance (${keywordMatches} keywords), and structure analysis`
  };
} 