import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDeepSeekApi } from '@/lib/deepseek';
import { getAuthSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { certificationId, questionId, transcript } = await request.json();

    if (!certificationId || !questionId || !transcript) {
      return NextResponse.json(
        { error: 'Certification ID, question ID, and transcript are required' },
        { status: 400 }
      );
    }

    // Get the certification with voice interview data
    const certification = await prisma.certification.findUnique({
      where: { id: certificationId },
      include: {
        module: true
      }
    });

    if (!certification) {
      return NextResponse.json(
        { error: 'Certification not found' },
        { status: 404 }
      );
    }

    if (certification.status !== 'VOICE_INTERVIEW_IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Certification is not in progress' },
        { status: 400 }
      );
    }

    const voiceInterviewData = certification.voiceInterviewData as any;
    if (!voiceInterviewData || !voiceInterviewData.questions) {
      return NextResponse.json(
        { error: 'Voice interview data not found' },
        { status: 500 }
      );
    }

    // Find the current question
    const currentQuestionIndex = voiceInterviewData.currentQuestionIndex || 0;
    const questions = voiceInterviewData.questions;
    
    // First try to find by ID, then by index as fallback
    let currentQuestion = questions.find((q: any) => q.id === questionId);
    
    // If question not found by ID, try to get it by index
    if (!currentQuestion && Array.isArray(questions) && questions.length > currentQuestionIndex) {
      currentQuestion = questions[currentQuestionIndex];
      console.log(`Question not found by ID, using question at index ${currentQuestionIndex} instead`);
    }

    if (!currentQuestion) {
      return NextResponse.json(
        { error: 'Question not found', questionId, availableQuestions: questions.length },
        { status: 404 }
      );
    }

    console.log(`Scoring response for question: ${currentQuestion.id}`);
    
    // Hybrid scoring approach - combines keyword matching with AI semantic understanding
    const scoreResponse = async (question: any, userResponse: string) => {
      const maxPoints = question.points || 5;
      const keywords = question.expectedKeywords || [];
      
      // PART 1: Fast keyword-based scoring
      // Count how many keywords are in the response
      const lowercaseResponse = userResponse.toLowerCase();
      const matchedKeywords = keywords.filter(keyword => 
        lowercaseResponse.includes(keyword.toLowerCase())
      );
      
      // Calculate percentage of keywords matched
      const keywordPercentage = keywords.length > 0 
        ? matchedKeywords.length / keywords.length 
        : 0.7; // Default to 70% if no keywords
      
      // Response length factor (longer responses generally better, up to a point)
      const lengthFactor = Math.min(userResponse.length / 100, 1.0);
      
      // Calculate initial score based on keywords and length
      const keywordScore = Math.ceil(
        maxPoints * (keywordPercentage * 0.7 + lengthFactor * 0.3)
      );
      
      // PART 2: AI semantic understanding (if response is long enough)
      // Only use AI for responses that are substantial enough to analyze
      let aiScore = keywordScore;
      let aiInsights = null;
      
      try {
        if (userResponse.length > 15) { // Only use AI for non-trivial responses
          const deepseek = await getDeepSeekApi();
          
          const prompt = `
You are evaluating a response to a certification question. 
Question: "${question.question}"
Response: "${userResponse}"

Expected keywords: ${keywords.join(', ')}
Scoring criteria:
- Excellent (${maxPoints} points): ${question.scoringCriteria?.excellent || "Comprehensive answer with all key points"}
- Good (${Math.ceil(maxPoints * 0.75)} points): ${question.scoringCriteria?.good || "Good answer with most key points"}
- Adequate (${Math.ceil(maxPoints * 0.5)} points): ${question.scoringCriteria?.adequate || "Basic answer with some key points"}
- Poor (${Math.ceil(maxPoints * 0.25)} points): ${question.scoringCriteria?.poor || "Incomplete or incorrect answer"}

Evaluate the response and provide:
1. A score from 1 to ${maxPoints} (can be decimal)
2. Brief feedback (1-2 sentences)
3. 1-2 strengths of the response
4. 1-2 areas for improvement

Format your response as JSON:
{
  "score": number,
  "feedback": "string",
  "strengths": ["string"],
  "areas_for_improvement": ["string"]
}
`;

          const aiResponse = await deepseek.chat.completions.create({
            model: "deepseek-chat",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
            max_tokens: 500,
            response_format: { type: "json_object" }
          });
          
          const aiContent = aiResponse.choices[0]?.message?.content || "";
          
          try {
            aiInsights = JSON.parse(aiContent);
            aiScore = Math.min(Math.max(Math.round(aiInsights.score), 1), maxPoints);
          } catch (parseError) {
            console.warn("Failed to parse AI response:", parseError);
            // Fall back to keyword score if AI response parsing fails
          }
        }
      } catch (aiError) {
        console.warn("AI scoring failed, using keyword-based score:", aiError);
        // Continue with keyword score if AI fails
      }
      
      // PART 3: Combine scores - weighted average of keyword and AI scores
      // If AI scoring succeeded, use a weighted combination
      const finalScore = aiInsights ? 
        Math.round(keywordScore * 0.4 + aiScore * 0.6) : // 40% keyword, 60% AI when available
        keywordScore; // 100% keyword when AI not available
      
      // Ensure score is at least 1 and at most maxPoints
      const boundedScore = Math.max(1, Math.min(finalScore, maxPoints));
      
      // Generate feedback
      let feedback;
      let strengths = [];
      let areas_for_improvement = [];
      
      if (aiInsights) {
        // Use AI-generated feedback when available
        feedback = aiInsights.feedback;
        strengths = aiInsights.strengths || [];
        areas_for_improvement = aiInsights.areas_for_improvement || [];
      } else {
        // Fall back to template-based feedback
        if (boundedScore >= maxPoints * 0.8) {
          feedback = "Excellent response that covers key points thoroughly.";
          strengths = ["Comprehensive answer", "Demonstrated strong knowledge"];
          areas_for_improvement = ["Continue to develop practical applications"];
        } else if (boundedScore >= maxPoints * 0.6) {
          feedback = "Good response with most key points covered.";
          strengths = ["Good understanding of the topic"];
          areas_for_improvement = ["Could include more specific details"];
        } else if (boundedScore >= maxPoints * 0.4) {
          feedback = "Adequate response with some key points.";
          strengths = ["Basic understanding demonstrated"];
          areas_for_improvement = ["Needs more depth", "Include more key concepts"];
        } else {
          feedback = "Response needs improvement to demonstrate understanding.";
          strengths = ["Attempted to answer the question"];
          areas_for_improvement = ["Review the topic material", "Include key terminology"];
        }
      }
      
      return {
        score: boundedScore,
        feedback,
        strengths,
        areas_for_improvement,
        matchedKeywords: matchedKeywords.length,
        totalKeywords: keywords.length,
        aiScoreUsed: !!aiInsights
      };
    };
    
    // Score the response
    const scoreData = await scoreResponse(currentQuestion, transcript);

    // Update certification with response
    const responses = voiceInterviewData.responses || [];
    responses.push({
      questionId,
      transcript,
      score: scoreData.score,
      feedback: scoreData.feedback,
      strengths: scoreData.strengths,
      areas_for_improvement: scoreData.areas_for_improvement,
      timestamp: new Date().toISOString()
    });

    // Move to next question
    const nextQuestionIndex = currentQuestionIndex + 1;
    const nextQuestion = nextQuestionIndex < questions.length ? questions[nextQuestionIndex] : null;

    try {
      await prisma.certification.update({
        where: { id: certificationId },
        data: {
          voiceInterviewData: {
            ...voiceInterviewData,
            responses,
            currentQuestionIndex: nextQuestionIndex
          }
        }
      });
      
      // Try to log analytics but don't block on it
      prisma.certificationAnalytics.create({
        data: {
          certificationId,
          userId: session.user.id,
          moduleId: certification.moduleId,
          eventType: 'VOICE_RESPONSE_SCORED',
          eventData: {
            questionId,
            score: scoreData.score,
            maxPoints: currentQuestion.points || 5,
            questionIndex: currentQuestionIndex,
            responseLength: transcript.length,
            matchedKeywords: scoreData.matchedKeywords,
            totalKeywords: scoreData.totalKeywords,
            aiScoreUsed: scoreData.aiScoreUsed
          }
        }
      }).catch(() => {
        console.warn('Failed to log analytics, but continuing');
      });

      return NextResponse.json({
        success: true,
        score: scoreData.score,
        feedback: scoreData.feedback,
        strengths: scoreData.strengths,
        areas_for_improvement: scoreData.areas_for_improvement,
        nextQuestion
      });
    } catch (dbError) {
      console.error('Error updating certification:', dbError);
      
      // Return the score and next question even if DB update fails
      // This allows the client to continue even if the server state isn't updated
      return NextResponse.json({
        success: true,
        score: scoreData.score,
        feedback: scoreData.feedback + " (Note: Your progress may not be saved due to a server error.)",
        strengths: scoreData.strengths,
        areas_for_improvement: [...(scoreData.areas_for_improvement || []), "Try refreshing the page if issues persist"],
        nextQuestion
      });
    }

  } catch (error) {
    console.error('Error scoring voice response:', error);
    return NextResponse.json(
      { error: 'Failed to score response', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 