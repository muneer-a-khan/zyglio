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
      prisma.quizBank.findMany({
        include: {
          module: true
        }
      }),
      prisma.voiceQuestionBank.findMany({
        include: {
          module: true
        }
      }),
      prisma.document.findMany({
        include: {
          Chunk: true
        }
      }),
      prisma.chunk.findMany({
        include: {
          Document: true
        }
      }),
      prisma.mediaItem.findMany({
        include: {
          ParsedMediaContent: true
        }
      }),
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

    // Convert all content to plain text format
    let textContent = `ZYGLIO TRAINING AND CERTIFICATION KNOWLEDGE BASE\n`;
    textContent += `Last Updated: ${new Date().toISOString()}\n\n`;

    // Training Modules
    textContent += `=== TRAINING MODULES ===\n\n`;
    for (const module of trainingModules) {
      textContent += `MODULE: ${module.title}\n`;
      textContent += `Subtopics: ${JSON.stringify(module.subtopics)}\n`;
      
      if (module.certificationScenarioText) {
        textContent += `Certification Scenario: ${module.certificationScenarioText}\n`;
      }

      textContent += `Content:\n`;
      for (const content of module.content) {
        textContent += `  - ${content.subtopic}: ${content.title}\n`;
        textContent += `    Type: ${content.contentType}\n`;
        textContent += `    Content: ${JSON.stringify(content.content)}\n`;
        textContent += `    Estimated Time: ${content.estimatedTime} minutes\n`;
      }

      if (module.procedure) {
        textContent += `Procedure: ${module.procedure.title}\n`;
        for (const step of module.procedure.ProcedureStep) {
          textContent += `  Step ${step.index}: ${step.content}\n`;
          if (step.notes) textContent += `    Notes: ${step.notes}\n`;
          if (step.conditions) textContent += `    Conditions: ${step.conditions}\n`;
          
          for (const media of step.MediaItem) {
            if (media.caption) {
              textContent += `    Media: ${media.type} - ${media.caption}\n`;
            }
            if (media.relevance) {
              textContent += `    Relevance: ${media.relevance}\n`;
            }
          }
        }
      }
      textContent += `\n`;
    }

    // Procedures
    textContent += `=== PROCEDURES ===\n\n`;
    for (const procedure of procedures) {
      textContent += `PROCEDURE: ${procedure.title}\n`;
      for (const step of procedure.ProcedureStep) {
        textContent += `Step ${step.index}: ${step.content}\n`;
        if (step.notes) textContent += `Notes: ${step.notes}\n`;
        if (step.conditions) textContent += `Conditions: ${step.conditions}\n`;
        
        for (const question of step.Question) {
          textContent += `Question (${question.type}): ${question.content}\n`;
          if (question.options) textContent += `Options: ${question.options}\n`;
          if (question.correct) textContent += `Correct Answer: ${question.correct}\n`;
        }

        for (const media of step.MediaItem) {
          if (media.caption) {
            textContent += `Media: ${media.type} - ${media.caption}\n`;
          }
          if (media.relevance) {
            textContent += `Relevance: ${media.relevance}\n`;
          }
        }
      }
      textContent += `\n`;
    }

    // Quiz Banks
    textContent += `=== QUIZ ASSESSMENTS ===\n\n`;
    for (const quiz of quizBanks) {
      textContent += `QUIZ BANK: ${quiz.module.title} - ${quiz.subtopic}\n`;
      textContent += `Passing Score: ${quiz.passingScore}%\n`;
      textContent += `Questions: ${JSON.stringify(quiz.questions)}\n\n`;
    }

    // Voice Question Banks
    textContent += `=== VOICE ASSESSMENTS ===\n\n`;
    for (const bank of voiceQuestionBanks) {
      textContent += `VOICE QUESTION BANK: ${bank.module.title}\n`;
      textContent += `Difficulty: ${bank.difficulty}\n`;
      textContent += `Questions: ${JSON.stringify(bank.questions)}\n\n`;
    }

    // Documents
    textContent += `=== DOCUMENTS ===\n\n`;
    for (const doc of documents) {
      textContent += `DOCUMENT: ${doc.title}\n`;
      textContent += `Source Type: ${doc.sourcetype}\n`;
      if (doc.broadtopic) textContent += `Topic: ${doc.broadtopic}\n`;
      if (doc.content) textContent += `Content: ${doc.content}\n`;
      if (doc.url) textContent += `URL: ${doc.url}\n`;
      
      for (const chunk of doc.Chunk) {
        textContent += `Chunk ${chunk.sequencenumber}: ${chunk.text}\n`;
      }
      textContent += `\n`;
    }

    // Media Content
    textContent += `=== MEDIA CONTENT ===\n\n`;
    for (const item of mediaItems) {
      if (item.ParsedMediaContent.length > 0) {
        textContent += `MEDIA: ${item.type}\n`;
        if (item.caption) textContent += `Caption: ${item.caption}\n`;
        if (item.relevance) textContent += `Relevance: ${item.relevance}\n`;
        
        for (const parsed of item.ParsedMediaContent) {
          if (parsed.extractedText) textContent += `Extracted Text: ${parsed.extractedText}\n`;
          if (parsed.summary) textContent += `Summary: ${parsed.summary}\n`;
          if (parsed.keyTopics) textContent += `Key Topics: ${JSON.stringify(parsed.keyTopics)}\n`;
        }
        textContent += `\n`;
      }
    }

    // Simulations
    textContent += `=== SIMULATIONS ===\n\n`;
    for (const step of simulationSteps) {
      textContent += `SIMULATION: ${step.Simulation.LearningTask.title}\n`;
      textContent += `Prompt: ${step.prompt}\n`;
      if (step.expectedAnswer) textContent += `Expected Answer: ${step.expectedAnswer}\n`;
      if (step.feedback) textContent += `Feedback: ${step.feedback}\n`;
      textContent += `\n`;
    }

    // Additional chunks for comprehensive coverage
    textContent += `=== ADDITIONAL CONTENT CHUNKS ===\n\n`;
    for (const chunk of chunks) {
      textContent += `${chunk.text}\n\n`;
    }

    return new NextResponse(textContent, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('Error fetching knowledge base text:', error);
    return new NextResponse(
      'Error: Failed to fetch knowledge base content',
      { 
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      }
    );
  }
} 