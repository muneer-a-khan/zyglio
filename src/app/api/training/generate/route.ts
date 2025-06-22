import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deepseekApi } from '@/lib/deepseek';

export async function POST(request: NextRequest) {
  try {
    const { procedureId } = await request.json();

    if (!procedureId) {
      return NextResponse.json(
        { error: 'Procedure ID is required' },
        { status: 400 }
      );
    }

    // Get the procedure with its steps
    const procedure = await prisma.procedure.findUnique({
      where: { id: procedureId },
      include: {
        ProcedureStep: {
          orderBy: { index: 'asc' }
        },
        LearningTask: true
      }
    });

    if (!procedure) {
      return NextResponse.json(
        { error: 'Procedure not found' },
        { status: 404 }
      );
    }

    // Check if training module already exists
    const existingModule = await prisma.trainingModule.findFirst({
      where: { procedureId }
    });

    if (existingModule) {
      return NextResponse.json(
        { 
          error: 'Training module already exists for this procedure',
          moduleId: existingModule.id
        },
        { status: 409 }
      );
    }

    // Extract procedure content for analysis
    const procedureContent = {
      title: procedure.title,
      steps: procedure.ProcedureStep.map(step => ({
        index: step.index,
        content: step.content,
        notes: step.notes,
        conditions: step.conditions
      }))
    };

    // Generate subtopics using DeepSeek
    const subtopicsPrompt = `
Analyze this procedure and identify 3-6 logical learning subtopics that would help someone learn this procedure effectively:

Procedure Title: ${procedure.title}

Procedure Steps:
${procedureContent.steps.map(step => `${step.index}. ${step.content}`).join('\n')}

For each subtopic, provide:
1. A clear, descriptive title
2. A 2-3 sentence description of what this subtopic covers
3. Which procedure steps are related to this subtopic

Format your response as JSON with this structure:
{
  "subtopics": [
    {
      "title": "Subtopic Title",
      "description": "Description of what this covers",
      "relatedSteps": [1, 2, 3],
      "estimatedTime": 15
    }
  ]
}

Make sure subtopics are logical learning chunks, not just individual steps.
`;

    const subtopicsResponse = await deepseekApi.chat({
      messages: [{ role: 'user', content: subtopicsPrompt }],
      model: 'deepseek-chat',
      response_format: { type: 'json_object' }
    });

    let subtopics;
    try {
      subtopics = JSON.parse(subtopicsResponse.choices[0].message.content).subtopics;
    } catch (error) {
      console.error('Error parsing subtopics response:', error);
      return NextResponse.json(
        { error: 'Failed to generate subtopics' },
        { status: 500 }
      );
    }

    // Create the training module
    const trainingModule = await prisma.trainingModule.create({
      data: {
        procedureId,
        title: `Training: ${procedure.title}`,
        subtopics: subtopics,
        version: 1
      }
    });

    // Generate content for each subtopic
    const contentGenerationPromises = subtopics.map(async (subtopic: any, index: number) => {
      // Generate article content
      const articlePrompt = `
Create comprehensive educational content for this training subtopic:

Subtopic: ${subtopic.title}
Description: ${subtopic.description}

Related Procedure Steps:
${subtopic.relatedSteps.map((stepIndex: number) => {
  const step = procedureContent.steps.find(s => s.index === stepIndex);
  return step ? `${step.index}. ${step.content}` : '';
}).filter(Boolean).join('\n')}

Create a detailed, educational article (1000-1500 words) that includes:
1. Clear introduction to the subtopic
2. Step-by-step explanations
3. Important concepts and terminology
4. Safety considerations (if applicable)
5. Common mistakes to avoid
6. Key takeaways

Format as JSON:
{
  "title": "Article title",
  "content": "Full article content in markdown format",
  "keyPoints": ["key point 1", "key point 2"],
  "safetyNotes": ["safety note 1", "safety note 2"]
}
`;

      const articleResponse = await deepseekApi.chat({
        messages: [{ role: 'user', content: articlePrompt }],
        model: 'deepseek-chat',
        response_format: { type: 'json_object' }
      });

      const articleData = JSON.parse(articleResponse.choices[0].message.content);

      // Generate quiz questions for this subtopic
      const quizPrompt = `
Create 8-12 quiz questions for this training subtopic:

Subtopic: ${subtopic.title}
Article Content: ${articleData.content.substring(0, 1000)}...

Generate a mix of question types:
- Multiple choice (4 options each)
- True/False
- Fill in the blank
- Short answer

Format as JSON:
{
  "questions": [
    {
      "type": "multiple_choice",
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "explanation": "Why this is correct"
    },
    {
      "type": "true_false",
      "question": "Statement",
      "correct": true,
      "explanation": "Explanation"
    }
  ]
}
`;

      const quizResponse = await deepseekApi.chat({
        messages: [{ role: 'user', content: quizPrompt }],
        model: 'deepseek-chat',
        response_format: { type: 'json_object' }
      });

      const quizData = JSON.parse(quizResponse.choices[0].message.content);

      // Create training content
      await prisma.trainingContent.create({
        data: {
          moduleId: trainingModule.id,
          subtopic: subtopic.title,
          contentType: 'ARTICLE',
          title: articleData.title,
          content: articleData,
          orderIndex: index,
          estimatedTime: subtopic.estimatedTime || 15
        }
      });

      // Create quiz bank
      await prisma.quizBank.create({
        data: {
          moduleId: trainingModule.id,
          subtopic: subtopic.title,
          questions: quizData.questions,
          passingScore: 80
        }
      });

      return { subtopic: subtopic.title, completed: true };
    });

    // Wait for all content generation to complete
    await Promise.all(contentGenerationPromises);

    // Return the created training module
    const completeModule = await prisma.trainingModule.findUnique({
      where: { id: trainingModule.id },
      include: {
        content: true,
        quizBanks: true,
        procedure: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Training content generated successfully',
      module: completeModule,
      requiresApproval: true
    });

  } catch (error) {
    console.error('Error generating training content:', error);
    return NextResponse.json(
      { error: 'Failed to generate training content' },
      { status: 500 }
    );
  }
} 