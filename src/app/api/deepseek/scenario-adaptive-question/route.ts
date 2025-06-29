import { NextRequest, NextResponse } from 'next/server';
import { getDeepSeekApi } from '@/lib/deepseek';
import { getCachedResponse, cacheResponse, getCachedPrompt } from '@/lib/ai-cache';

export async function POST(request: NextRequest) {
  try {
    const { 
      prompt, 
      scenario, 
      previousResponses, 
      currentQuestionNumber, 
      averageScore, 
      lowestCompetency, 
      moduleContent 
    } = await request.json();

    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario is required' },
        { status: 400 }
      );
    }

    console.log('🚀 Fast adaptive question generation');

    // Generate cache key
    const cacheKey = `adaptive_question_${scenario.id}_${currentQuestionNumber}_${lowestCompetency}_${Math.round(averageScore)}`;
    
    // Check cache first
    const cachedResult = getCachedResponse(cacheKey);
    if (cachedResult) {
      console.log('✅ Using cached adaptive question');
      return NextResponse.json(cachedResult);
    }

    const deepseek = getDeepSeekApi();

    // Use optimized prompt if provided, otherwise create simple one
    const optimizedPrompt = prompt || `
Generate a certification question for scenario: ${scenario.title}
Focus on: ${lowestCompetency} competency
Question number: ${currentQuestionNumber}
Previous average: ${averageScore.toFixed(1)}/10

Make it specific and practical. Test ${lowestCompetency} skills.

Return JSON: {"question": "your question", "reasoning": "focus rationale"}`;

    try {
      const completion = await deepseek.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "You are a fast question generator. Create practical certification questions. Always return valid JSON."
          },
          {
            role: "user",
            content: optimizedPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 300 // Reduced for faster generation
      });

      const aiResponse = completion.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('No response from DeepSeek API');
      }

      // Parse response
      let questionData;
      try {
        const cleanedResponse = aiResponse
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();
        
        questionData = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.warn('Failed to parse AI response, using fallback');
        
        // Fallback question based on competency focus
        const fallbackQuestions = {
          accuracy: `What are the most important technical details to remember when performing ${scenario.title.toLowerCase()}?`,
          application: `How would you apply your knowledge of ${scenario.title.toLowerCase()} in a real-world situation?`,
          communication: `Can you clearly explain the key steps involved in ${scenario.title.toLowerCase()}?`,
          problemSolving: `What would you do if something went wrong during ${scenario.title.toLowerCase()}?`,
          completeness: `What additional factors should be considered when ${scenario.title.toLowerCase()}?`
        };
        
        questionData = {
          question: fallbackQuestions[lowestCompetency as keyof typeof fallbackQuestions] || 
                   `Tell me more about your approach to ${scenario.title.toLowerCase()}.`,
          reasoning: `Fallback question focusing on ${lowestCompetency} due to AI parsing error`
        };
      }

      // Ensure we have required fields
      if (!questionData.question) {
        questionData.question = `Can you elaborate on your understanding of ${scenario.title.toLowerCase()}?`;
      }
      if (!questionData.reasoning) {
        questionData.reasoning = `Generated question focusing on ${lowestCompetency} competency`;
      }

      // Cache the result
      cacheResponse(cacheKey, questionData);

      console.log(`✅ Adaptive question generated focusing on: ${lowestCompetency}`);

      return NextResponse.json(questionData);

    } catch (error) {
      console.error('Error generating adaptive question:', error);
      
      // Comprehensive fallback
      const fallbackQuestions = {
        accuracy: `What are the key technical requirements for ${scenario.title.toLowerCase()}?`,
        application: `How do you practically implement ${scenario.title.toLowerCase()}?`,
        communication: `Can you walk me through the process of ${scenario.title.toLowerCase()}?`,
        problemSolving: `What challenges might arise with ${scenario.title.toLowerCase()} and how would you handle them?`,
        completeness: `What additional considerations are important for ${scenario.title.toLowerCase()}?`
      };

      const fallbackResult = {
        question: fallbackQuestions[lowestCompetency as keyof typeof fallbackQuestions] || 
                 `Please share your thoughts on ${scenario.title.toLowerCase()}.`,
        reasoning: `Fallback question generated due to system error, focusing on ${lowestCompetency}`
      };

      return NextResponse.json(fallbackResult);
    }

  } catch (error) {
    console.error('Error in scenario adaptive question API:', error);
    
    return NextResponse.json({
      question: "Can you tell me more about your experience with this type of scenario?",
      reasoning: "Generic fallback question due to system error"
    });
  }
} 