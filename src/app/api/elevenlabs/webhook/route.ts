import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createHash, createHmac } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface ElevenLabsWebhookData {
  type: 'post_call_transcription';
  event_timestamp: number;
  data: {
    agent_id: string;
    conversation_id: string;
    status: string;
    user_id?: string;
    transcript: Array<{
      role: 'agent' | 'user';
      message: string;
      time_in_call_secs: number;
      tool_calls?: any;
      tool_results?: any;
      feedback?: any;
      conversation_turn_metrics?: any;
    }>;
    metadata: {
      start_time_unix_secs: number;
      call_duration_secs: number;
      cost: number;
      termination_reason: string;
      feedback: {
        overall_score?: number;
        likes: number;
        dislikes: number;
      };
    };
    analysis: {
      evaluation_criteria_results: Record<string, any>;
      data_collection_results: Record<string, any>;
      call_successful: 'success' | 'failure' | 'unknown';
      transcript_summary: string;
    };
    conversation_initiation_client_data?: {
      dynamic_variables?: {
        user_id?: string;
        module_id?: string;
        certification_session_id?: string;
      };
    };
  };
}

// Basketball certification scoring criteria
const BASKETBALL_SCORING_CRITERIA = {
  fundamentals: {
    keywords: ['dribble', 'shoot', 'pass', 'defense', 'rebound', 'layup', 'free throw'],
    weight: 0.3,
    minMentions: 3
  },
  strategy: {
    keywords: ['play', 'strategy', 'position', 'team', 'coach', 'game plan', 'offense', 'screen'],
    weight: 0.25,
    minMentions: 2
  },
  rules: {
    keywords: ['foul', 'violation', 'rules', 'referee', 'technical', 'personal foul', 'traveling'],
    weight: 0.25,
    minMentions: 2
  },
  engagement: {
    minTurns: 5,
    minDuration: 60, // seconds
    weight: 0.2
  }
};

function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature) return false;
  
  try {
    // ElevenLabs signature format: t=timestamp,v0=hash
    const parts = signature.split(',');
    const timestamp = parts[0]?.split('=')[1];
    const hash = parts[1]?.split('=')[1];
    
    if (!timestamp || !hash) return false;
    
    // Validate timestamp (within 30 minutes)
    const now = Math.floor(Date.now() / 1000);
    if (now - parseInt(timestamp) > 30 * 60) return false;
    
    // Validate signature
    const payloadToSign = `${timestamp}.${payload}`;
    const expectedHash = createHmac('sha256', secret)
      .update(payloadToSign)
      .digest('hex');
    
    return hash === expectedHash;
  } catch (error) {
    console.error('Webhook signature validation error:', error);
    return false;
  }
}

function scoreBasketballConversation(data: ElevenLabsWebhookData['data']): {
  score: number;
  passed: boolean;
  breakdown: Record<string, any>;
  feedback: string;
} {
  const { transcript, metadata, analysis } = data;
  
  // Combine all user messages for analysis
  const userMessages = transcript
    .filter(turn => turn.role === 'user')
    .map(turn => turn.message.toLowerCase())
    .join(' ');
  
  const agentMessages = transcript
    .filter(turn => turn.role === 'agent')
    .map(turn => turn.message.toLowerCase())
    .join(' ');
  
  const allText = userMessages + ' ' + agentMessages;
  
  let totalScore = 0;
  const breakdown: Record<string, any> = {};
  
  // Score fundamentals knowledge
  const fundamentalsMatches = BASKETBALL_SCORING_CRITERIA.fundamentals.keywords
    .filter(keyword => allText.includes(keyword)).length;
  const fundamentalsScore = Math.min(
    fundamentalsMatches / BASKETBALL_SCORING_CRITERIA.fundamentals.minMentions, 
    1
  ) * BASKETBALL_SCORING_CRITERIA.fundamentals.weight;
  
  breakdown.fundamentals = {
    score: fundamentalsScore,
    matches: fundamentalsMatches,
    required: BASKETBALL_SCORING_CRITERIA.fundamentals.minMentions
  };
  totalScore += fundamentalsScore;
  
  // Score strategy knowledge
  const strategyMatches = BASKETBALL_SCORING_CRITERIA.strategy.keywords
    .filter(keyword => allText.includes(keyword)).length;
  const strategyScore = Math.min(
    strategyMatches / BASKETBALL_SCORING_CRITERIA.strategy.minMentions,
    1
  ) * BASKETBALL_SCORING_CRITERIA.strategy.weight;
  
  breakdown.strategy = {
    score: strategyScore,
    matches: strategyMatches,
    required: BASKETBALL_SCORING_CRITERIA.strategy.minMentions
  };
  totalScore += strategyScore;
  
  // Score rules knowledge
  const rulesMatches = BASKETBALL_SCORING_CRITERIA.rules.keywords
    .filter(keyword => allText.includes(keyword)).length;
  const rulesScore = Math.min(
    rulesMatches / BASKETBALL_SCORING_CRITERIA.rules.minMentions,
    1
  ) * BASKETBALL_SCORING_CRITERIA.rules.weight;
  
  breakdown.rules = {
    score: rulesScore,
    matches: rulesMatches,
    required: BASKETBALL_SCORING_CRITERIA.rules.minMentions
  };
  totalScore += rulesScore;
  
  // Score engagement
  const userTurns = transcript.filter(turn => turn.role === 'user').length;
  const callDuration = metadata.call_duration_secs;
  
  const engagementScore = (
    Math.min(userTurns / BASKETBALL_SCORING_CRITERIA.engagement.minTurns, 1) * 0.5 +
    Math.min(callDuration / BASKETBALL_SCORING_CRITERIA.engagement.minDuration, 1) * 0.5
  ) * BASKETBALL_SCORING_CRITERIA.engagement.weight;
  
  breakdown.engagement = {
    score: engagementScore,
    userTurns,
    callDuration,
    requiredTurns: BASKETBALL_SCORING_CRITERIA.engagement.minTurns,
    requiredDuration: BASKETBALL_SCORING_CRITERIA.engagement.minDuration
  };
  totalScore += engagementScore;
  
  // Convert to percentage
  const finalScore = Math.round(totalScore * 100);
  const passed = finalScore >= 70; // 70% passing score
  
  // Generate feedback
  let feedback = `Basketball Certification Score: ${finalScore}%\n\n`;
  
  if (passed) {
    feedback += "🏀 Congratulations! You've passed the basketball certification.\n\n";
  } else {
    feedback += "📚 You need to improve in the following areas to pass:\n\n";
  }
  
  if (breakdown.fundamentals.score < BASKETBALL_SCORING_CRITERIA.fundamentals.weight * 0.7) {
    feedback += "• Study basic basketball fundamentals (dribbling, shooting, passing)\n";
  }
  if (breakdown.strategy.score < BASKETBALL_SCORING_CRITERIA.strategy.weight * 0.7) {
    feedback += "• Learn more about basketball strategy and team play\n";
  }
  if (breakdown.rules.score < BASKETBALL_SCORING_CRITERIA.rules.weight * 0.7) {
    feedback += "• Review basketball rules and violations\n";
  }
  if (breakdown.engagement.score < BASKETBALL_SCORING_CRITERIA.engagement.weight * 0.7) {
    feedback += "• Engage more actively in the conversation (longer discussion)\n";
  }
  
  return {
    score: finalScore,
    passed,
    breakdown,
    feedback
  };
}

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 ElevenLabs webhook received');
    
    const headersList = headers();
    const signature = headersList.get('elevenlabs-signature');
    const payload = await request.text();
    
    // Validate webhook signature (you'll need to add your webhook secret to env)
    const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;
    if (webhookSecret && !validateWebhookSignature(payload, signature || '', webhookSecret)) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    const webhookData: ElevenLabsWebhookData = JSON.parse(payload);
    
    // Only handle transcription webhooks
    if (webhookData.type !== 'post_call_transcription') {
      console.log('ℹ️  Ignoring non-transcription webhook:', webhookData.type);
      return NextResponse.json({ status: 'ignored' });
    }
    
    const { data } = webhookData;
    console.log('📝 Processing transcript for conversation:', data.conversation_id);
    console.log('📊 Call duration:', data.metadata.call_duration_secs, 'seconds');
    console.log('💬 Transcript turns:', data.transcript.length);
    
    // Extract user info from dynamic variables or find by conversation ID
    const userId = data.conversation_initiation_client_data?.dynamic_variables?.user_id;
    const moduleId = data.conversation_initiation_client_data?.dynamic_variables?.module_id;
    
    if (!userId || !moduleId) {
      console.warn('⚠️  Missing user_id or module_id in webhook data');
      // Could still process and store for manual review
    }
    
    // Score the basketball conversation
    const scoringResult = scoreBasketballConversation(data);
    
    console.log('🏀 Basketball certification scoring:', {
      score: scoringResult.score,
      passed: scoringResult.passed,
      breakdown: scoringResult.breakdown
    });
    
    // Store certification result in database
    if (userId && moduleId) {
      try {
        // Get the procedure ID from the training module
        const module = await prisma.trainingModule.findUnique({
          where: { id: moduleId },
          select: { procedureId: true }
        });
        
        if (!module?.procedureId) {
          console.error('❌ Module not found or missing procedureId:', moduleId);
          return NextResponse.json({ error: 'Invalid module' }, { status: 400 });
        }
        
        // Check if certification already exists, update if it does
        const existingCertification = await prisma.certification.findUnique({
          where: { userId_moduleId: { userId, moduleId } }
        });
        
        if (existingCertification) {
          // Update existing certification
          const certification = await prisma.certification.update({
            where: { id: existingCertification.id },
            data: {
              status: 'completed',
              passed: scoringResult.passed,
              overallScore: scoringResult.score,
              voiceInterviewScore: scoringResult.score,
              voiceInterviewData: JSON.stringify({
                conversationId: data.conversation_id,
                transcript: data.transcript,
                scoring: scoringResult,
                metadata: data.metadata
              }),
              competencyScores: JSON.stringify(scoringResult.breakdown),
              certifiedAt: scoringResult.passed ? new Date() : null
            }
          });
          
          console.log('✅ Certification updated:', certification.id);
        } else {
          // Create new certification
          const certification = await prisma.certification.create({
            data: {
              userId,
              moduleId,
              procedureId: module.procedureId,
              status: 'completed',
              passed: scoringResult.passed,
              overallScore: scoringResult.score,
              voiceInterviewScore: scoringResult.score,
              voiceInterviewData: JSON.stringify({
                conversationId: data.conversation_id,
                transcript: data.transcript,
                scoring: scoringResult,
                metadata: data.metadata
              }),
              competencyScores: JSON.stringify(scoringResult.breakdown),
              certifiedAt: scoringResult.passed ? new Date() : null
            }
          });
          
          console.log('✅ Certification created:', certification.id);
        }
      } catch (dbError) {
        console.error('❌ Database error saving certification:', dbError);
        // Continue processing even if DB save fails
      }
    }
    
    // Optional: Send completion notification (email, push notification, etc.)
    console.log('📧 Certification result:', {
      userId,
      moduleId,
      score: scoringResult.score,
      passed: scoringResult.passed,
      feedback: scoringResult.feedback
    });
    
    return NextResponse.json({ 
      status: 'processed',
      score: scoringResult.score,
      passed: scoringResult.passed
    });
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' }, 
      { status: 500 }
    );
  }
} 