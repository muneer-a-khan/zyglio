import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    console.log('[Voice Interview] Transcript update received');
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      sessionId, 
      transcript, 
      messageType, 
      timestamp,
      questionContext,
      responseLength,
      speakingTime 
    } = await request.json();
    
    if (!sessionId || !transcript) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, transcript' },
        { status: 400 }
      );
    }

    console.log(`Processing transcript update for session: ${sessionId}`);

    // Find the certification session
    const certification = await prisma.certification.findFirst({
      where: {
        voiceInterviewData: {
          path: ['sessionId'],
          equals: sessionId
        }
      },
      include: {
        module: true
      }
    });

    if (!certification) {
      return NextResponse.json(
        { error: 'Certification session not found' },
        { status: 404 }
      );
    }

    // Verify user ownership
    if (certification.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const voiceInterviewData = certification.voiceInterviewData as any;
    if (!voiceInterviewData) {
      return NextResponse.json(
        { error: 'Voice interview data not found' },
        { status: 500 }
      );
    }

    // Update conversation history
    const conversationHistory = voiceInterviewData.conversationHistory || [];
    const newMessage = {
      role: messageType === 'user_transcript' ? 'user' : 'agent',
      content: transcript,
      timestamp: timestamp || new Date().toISOString(),
      questionContext,
      responseLength,
      speakingTime
    };

    conversationHistory.push(newMessage);

    // Calculate real-time progress metrics
    const userMessages = conversationHistory.filter((msg: any) => msg.role === 'user');
    const agentMessages = conversationHistory.filter((msg: any) => msg.role === 'agent');
    
    // Calculate engagement metrics
    const totalUserWords = userMessages.reduce((sum: number, msg: any) => 
      sum + (msg.content?.split(' ').length || 0), 0);
    const avgResponseLength = userMessages.length > 0 ? totalUserWords / userMessages.length : 0;
    const totalSpeakingTime = userMessages.reduce((sum: number, msg: any) => 
      sum + (msg.speakingTime || 0), 0);

    // Estimate progress based on conversation flow
    let estimatedProgress = 0;
    let estimatedScore = 0;

    if (userMessages.length > 0) {
      // Progress based on number of exchanges (assuming 5-8 questions for certification)
      const maxExpectedExchanges = 8;
      estimatedProgress = Math.min(100, (conversationHistory.length / (maxExpectedExchanges * 2)) * 100);

      // Score estimation based on engagement metrics
      const engagementScore = Math.min(100, 
        (avgResponseLength / 20) * 30 + // 30% for response length
        (userMessages.length / 5) * 40 + // 40% for participation
        Math.min(30, (totalSpeakingTime / 60)) // 30% for speaking time (max 30 seconds per response)
      );
      
      estimatedScore = Math.round(engagementScore);
    }

    // Update certification data
    const updatedVoiceData = {
      ...voiceInterviewData,
      conversationHistory,
      currentTranscript: transcript,
      lastTranscriptUpdate: new Date().toISOString(),
      progressMetrics: {
        totalExchanges: conversationHistory.length,
        userResponses: userMessages.length,
        agentQuestions: agentMessages.length,
        totalUserWords,
        avgResponseLength: Math.round(avgResponseLength * 10) / 10,
        totalSpeakingTime,
        estimatedProgress: Math.round(estimatedProgress),
        estimatedScore
      }
    };

    await prisma.certification.update({
      where: { id: certification.id },
      data: {
        voiceInterviewData: updatedVoiceData
      }
    });

    // Log analytics for transcript update
    await prisma.certificationAnalytics.create({
      data: {
        certificationId: certification.id,
        userId: session.user.id,
        moduleId: certification.moduleId,
        eventType: 'TRANSCRIPT_UPDATE',
        eventData: {
          messageType,
          transcriptLength: transcript.length,
          responseLength,
          speakingTime,
          estimatedProgress,
          estimatedScore,
          totalExchanges: conversationHistory.length
        }
      }
    }).catch(() => {
      console.warn('Failed to log transcript analytics');
    });

    console.log(`Transcript updated for session ${sessionId}, progress: ${estimatedProgress}%, score: ${estimatedScore}`);

    return NextResponse.json({
      success: true,
      progress: estimatedProgress,
      estimatedScore,
      totalExchanges: conversationHistory.length,
      userResponses: userMessages.length
    });

  } catch (error) {
    console.error('[Voice Interview] Error updating transcript:', error);
    return NextResponse.json(
      { error: 'Failed to update transcript', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 