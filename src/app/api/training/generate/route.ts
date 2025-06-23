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

    let subtopicsResponse;
    try {
      subtopicsResponse = await deepseekApi.chat.completions.create({
        messages: [{ role: 'user', content: subtopicsPrompt }],
        model: 'deepseek-chat',
        response_format: { type: 'json_object' }
      });
    } catch (error) {
      console.error('Error calling DeepSeek API:', error);
      return NextResponse.json(
        { error: 'Failed to connect to DeepSeek API. Please check your API key and try again.' },
        { status: 500 }
      );
    }

    let subtopics;
    try {
      const responseContent = subtopicsResponse.choices[0].message.content;
      if (!responseContent) {
        throw new Error('Empty response from AI');
      }
      subtopics = JSON.parse(responseContent).subtopics;
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
      try {
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
7. Embedded interactive elements for better engagement

Format as JSON:
{
  "title": "Article title",
  "content": "Full article content in markdown format",
  "keyPoints": ["key point 1", "key point 2", "key point 3"],
  "safetyNotes": ["safety note 1", "safety note 2"],
  "embeddedQuiz": [
    {
      "question": "Quick check question about a concept just explained",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this is correct"
    }
  ],
  "interactiveElements": [
    {
      "type": "knowledge_check",
      "position": "after_section_2",
      "title": "Check Your Understanding",
      "content": "Quick self-assessment question or reflection prompt"
    },
    {
      "type": "practical_tip",
      "position": "after_section_3",
      "title": "Pro Tip",
      "content": "Practical advice or best practice related to this section"
    }
  ]
}

REQUIREMENTS:
- Include 1-2 embedded quiz questions that test key concepts
- Add 2-3 interactive elements positioned throughout the article
- Make content engaging and practical
- Use clear, professional language
- Include specific examples where applicable
`;

        let articleResponse;
        try {
          articleResponse = await deepseekApi.chat.completions.create({
            messages: [{ role: 'user', content: articlePrompt }],
            model: 'deepseek-chat',
            response_format: { type: 'json_object' }
          });
        } catch (apiError) {
          console.error(`Error generating article for subtopic ${subtopic.title}:`, apiError);
          throw new Error(`Failed to generate article content for ${subtopic.title}`);
        }

        const articleResponseContent = articleResponse.choices[0].message.content;
        if (!articleResponseContent) {
          throw new Error('Empty article response from AI');
        }
        const articleData = JSON.parse(articleResponseContent);

        // Generate quiz questions for this subtopic
        const quizPrompt = `
Create 8-12 multiple choice quiz questions for this training subtopic:

Subtopic: ${subtopic.title}
Article Content: ${articleData.content.substring(0, 1000)}...

Create high-quality multiple choice questions that test understanding of key concepts. Each question MUST have exactly 4 answer options.

For true/false concepts, create multiple choice questions like "Which of the following statements is TRUE about X?" with 4 options.

Format as JSON with this exact structure:
{
  "questions": [
    {
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Detailed explanation of why this answer is correct"
    }
  ]
}

IMPORTANT REQUIREMENTS:
- Each question MUST have exactly 4 options in the "options" array
- Use "correctAnswer" (not "correct") as the index of the correct option (0-3)
- Make options realistic and plausible distractors
- Include detailed explanations for each correct answer
- Focus on practical understanding and application
- Ensure each question tests important learning objectives
`;

        let quizResponse;
        try {
          quizResponse = await deepseekApi.chat.completions.create({
            messages: [{ role: 'user', content: quizPrompt }],
            model: 'deepseek-chat',
            response_format: { type: 'json_object' }
          });
        } catch (apiError) {
          console.error(`Error generating quiz for subtopic ${subtopic.title}:`, apiError);
          throw new Error(`Failed to generate quiz content for ${subtopic.title}`);
        }

        const quizResponseContent = quizResponse.choices[0].message.content;
        if (!quizResponseContent) {
          throw new Error('Empty quiz response from AI');
        }
        const quizData = JSON.parse(quizResponseContent);

        // Validate and fix quiz questions
        const validatedQuestions = quizData.questions.map((question: any, qIndex: number) => {
          const validated = {
            question: question.question || `Question ${qIndex + 1}`,
            options: Array.isArray(question.options) ? question.options : [],
            correctAnswer: typeof question.correctAnswer === 'number' ? question.correctAnswer : 0,
            explanation: question.explanation || 'No explanation provided'
          };

          // Ensure we have exactly 4 options
          while (validated.options.length < 4) {
            validated.options.push(`Option ${validated.options.length + 1}`);
          }
          if (validated.options.length > 4) {
            validated.options = validated.options.slice(0, 4);
          }

          // Ensure correctAnswer is within bounds
          if (validated.correctAnswer < 0 || validated.correctAnswer >= validated.options.length) {
            validated.correctAnswer = 0;
          }

          return validated;
        }).filter((q: any) => q.question && q.question.trim() !== '');

        // Ensure we have at least 5 questions
        while (validatedQuestions.length < 5) {
          validatedQuestions.push({
            question: `Additional question ${validatedQuestions.length + 1} about ${subtopic.title}`,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: 0,
            explanation: 'Please review the content for the correct answer.'
          });
        }

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

        // Create quiz bank with validated questions
        await prisma.quizBank.create({
          data: {
            moduleId: trainingModule.id,
            subtopic: subtopic.title,
            questions: validatedQuestions,
            passingScore: 80
          }
        });

        return { subtopic: subtopic.title, completed: true };
      } catch (error) {
        console.error(`Error processing subtopic ${subtopic.title}:`, error);
        return { subtopic: subtopic.title, completed: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
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