import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Fetch all relevant training and certification data
    const [
      trainingModules,
      procedures,
      quizBanks,
      voiceQuestionBanks,
      documents,
      chunks,
      mediaItems,
      simulationSteps
    ] = await Promise.all([
      // Training modules with content
      prisma.trainingModule.findMany({
        where: { isApproved: true },
        include: {
          content: true,
          procedure: {
            include: {
              ProcedureStep: {
                include: {
                  MediaItem: true
                }
              }
            }
          }
        }
      }),

      // Procedures with steps
      prisma.procedure.findMany({
        include: {
          ProcedureStep: {
            include: {
              MediaItem: true,
              Question: true
            }
          }
        }
      }),

      // Quiz banks
      prisma.quizBank.findMany({
        include: {
          module: true
        }
      }),

      // Voice question banks
      prisma.voiceQuestionBank.findMany({
        include: {
          module: true
        }
      }),

      // Documents
      prisma.document.findMany({
        include: {
          Chunk: true
        }
      }),

      // Chunks for additional context
      prisma.chunk.findMany({
        include: {
          Document: true
        }
      }),

      // Media items with parsed content
      prisma.mediaItem.findMany({
        include: {
          ParsedMediaContent: true
        }
      }),

      // Simulation steps
      prisma.simulationStep.findMany({
        include: {
          Simulation: {
            include: {
              LearningTask: true
            }
          }
        }
      })
    ]);

    // Structure the data for ElevenLabs RAG consumption
    const knowledgeBase = {
      metadata: {
        title: "Zyglio Training and Certification Knowledge Base",
        description: "Comprehensive training modules, procedures, and certification content",
        lastUpdated: new Date().toISOString(),
        totalItems: trainingModules.length + procedures.length + quizBanks.length + documents.length
      },
      
      trainingModules: trainingModules.map(module => ({
        id: module.id,
        title: module.title,
        subtopics: module.subtopics,
        certificationScenario: module.certificationScenarioText,
        content: module.content.map(content => ({
          subtopic: content.subtopic,
          type: content.contentType,
          title: content.title,
          content: content.content,
          estimatedTime: content.estimatedTime
        })),
        procedure: module.procedure ? {
          title: module.procedure.title,
          steps: module.procedure.ProcedureStep.map(step => ({
            index: step.index,
            content: step.content,
            notes: step.notes,
            conditions: step.conditions,
            mediaItems: step.MediaItem.map(media => ({
              type: media.type,
              caption: media.caption,
              relevance: media.relevance
            }))
          }))
        } : null
      })),

      procedures: procedures.map(procedure => ({
        id: procedure.id,
        title: procedure.title,
        steps: procedure.ProcedureStep.map(step => ({
          index: step.index,
          content: step.content,
          notes: step.notes,
          conditions: step.conditions,
          questions: step.Question.map(q => ({
            type: q.type,
            content: q.content,
            options: q.options,
            correct: q.correct
          })),
          mediaItems: step.MediaItem.map(media => ({
            type: media.type,
            caption: media.caption,
            relevance: media.relevance
          }))
        }))
      })),

      assessments: {
        quizBanks: quizBanks.map(quiz => ({
          id: quiz.id,
          moduleTitle: quiz.module.title,
          subtopic: quiz.subtopic,
          questions: quiz.questions,
          passingScore: quiz.passingScore
        })),
        
        voiceQuestionBanks: voiceQuestionBanks.map(bank => ({
          id: bank.id,
          moduleTitle: bank.module.title,
          difficulty: bank.difficulty,
          questions: bank.questions
        }))
      },

      documents: documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        url: doc.url,
        sourceType: doc.sourcetype,
        broadTopic: doc.broadtopic,
        chunks: doc.Chunk.map(chunk => ({
          text: chunk.text,
          sequenceNumber: chunk.sequencenumber,
          metadata: chunk.metadata
        }))
      })),

      mediaContent: mediaItems
        .filter(item => item.ParsedMediaContent.length > 0)
        .map(item => ({
          id: item.id,
          type: item.type,
          caption: item.caption,
          relevance: item.relevance,
          parsedContent: item.ParsedMediaContent.map(parsed => ({
            extractedText: parsed.extractedText,
            summary: parsed.summary,
            keyTopics: parsed.keyTopics,
            confidence: parsed.confidence
          }))
        })),

      simulations: simulationSteps.map(step => ({
        id: step.id,
        prompt: step.prompt,
        expectedAnswer: step.expectedAnswer,
        feedback: step.feedback,
        taskTitle: step.Simulation.LearningTask.title
      })),

      searchableText: [
        // Combine all text content for easy searching
        ...trainingModules.flatMap(m => [
          m.title,
          JSON.stringify(m.subtopics),
          m.certificationScenarioText || '',
          ...m.content.map(c => `${c.title}: ${JSON.stringify(c.content)}`)
        ]),
        ...procedures.flatMap(p => [
          p.title,
          ...p.ProcedureStep.map(s => `${s.content} ${s.notes || ''}`)
        ]),
        ...documents.map(d => `${d.title}: ${d.content || ''}`),
        ...chunks.map(c => c.text)
      ].filter(Boolean).join(' ')
    };

    return NextResponse.json(knowledgeBase, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*', // Allow ElevenLabs to access
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('Error fetching knowledge base:', error);
    return NextResponse.json(
      { error: 'Failed to fetch knowledge base' },
      { status: 500 }
    );
  }
}

// Optional: Add a simpler text-only version for basic crawling
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    }
  });
} 