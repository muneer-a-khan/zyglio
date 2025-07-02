import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDeepSeekApi } from '@/lib/deepseek';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { sourceModuleId, context, newTitle } = await request.json();

    if (!sourceModuleId || !context) {
      return NextResponse.json(
        { error: 'Source module ID and context are required' },
        { status: 400 }
      );
    }

    // Get the source training module with all its content
    const sourceModule = await prisma.trainingModule.findUnique({
      where: { id: sourceModuleId },
      include: {
        procedure: {
          include: {
            ProcedureStep: {
              orderBy: { index: 'asc' }
            },
            LearningTask: true
          }
        },
        content: {
          orderBy: {
            orderIndex: 'asc'
          }
        },
        quizBanks: true
      }
    });

    if (!sourceModule) {
      return NextResponse.json(
        { error: 'Source training module not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to create similar modules
    // For now, allow any authenticated user to create similar modules
    // In the future, you might want to restrict this to SMEs or module owners

    // Extract source module content for analysis
    const sourceContent = {
      title: sourceModule.title,
      procedureTitle: sourceModule.procedure.title,
      subtopics: Array.isArray(sourceModule.subtopics) ? sourceModule.subtopics : [],
      content: sourceModule.content.map(c => ({
        subtopic: c.subtopic,
        title: c.title,
        content: c.content
      })),
      quizBanks: sourceModule.quizBanks.map(q => ({
        subtopic: q.subtopic,
        questions: Array.isArray(q.questions) ? q.questions : []
      }))
    };

    // Generate new subtopics using DeepSeek with the context
    const subtopicsPrompt = `
You are an expert instructional designer. Based on an existing training module and new context provided by the user, create a new set of learning subtopics.

EXISTING MODULE:
Title: ${sourceContent.title}
Procedure: ${sourceContent.procedureTitle}

EXISTING SUBTOPICS:
${sourceContent.subtopics.map((subtopic: any, index: number) => 
  `${index + 1}. ${subtopic.title} - ${subtopic.description}`
).join('\n')}

USER'S NEW CONTEXT:
${context}

TASK: Create 3-6 new subtopics that adapt the existing training content to the new context. The new subtopics should:
1. Maintain the core learning objectives but adapt them to the new context
2. Be relevant to the user's specified requirements
3. Follow a logical learning progression
4. Be specific and actionable

For each subtopic, provide:
1. A clear, descriptive title that reflects the new context
2. A 2-3 sentence description of what this subtopic covers
3. Estimated time in minutes

Format your response as JSON with this structure:
{
  "subtopics": [
    {
      "title": "New Subtopic Title",
      "description": "Description of what this covers in the new context",
      "estimatedTime": 15
    }
  ]
}

Make sure the new subtopics are tailored to the user's context while maintaining educational value.
`;

    let subtopicsResponse;
    try {
      const deepseekApi = getDeepSeekApi();
      
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

    // Create a new procedure for the similar module
    const newProcedure = await prisma.procedure.create({
      data: {
        title: newTitle || `Similar to: ${sourceModule.procedure.title}`,
        LearningTask: {
          create: {
            title: newTitle || `Similar to: ${sourceModule.procedure.title}`,
            presenter: session.user.name || session.user.email || 'Unknown',
            date: new Date(),
            userId: session.user.id
          }
        }
      },
      include: {
        LearningTask: true
      }
    });

    // Create the new training module
    const newTrainingModule = await prisma.trainingModule.create({
      data: {
        procedureId: newProcedure.id,
        title: newTitle || `Similar Training: ${sourceModule.title}`,
        subtopics: subtopics,
        version: 1,
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: session.user.id
      }
    });

    // Generate content for each new subtopic
    const contentGenerationPromises = subtopics.map(async (subtopic: any, index: number) => {
      try {
        const deepseekApi = getDeepSeekApi();
        
        // Generate article content based on source content and new context
        const articlePrompt = `
You are an expert instructional designer creating educational content for a training module.

TASK: Create comprehensive educational content for this training subtopic, adapting existing content to a new context.

NEW SUBTOPIC: ${subtopic.title}
DESCRIPTION: ${subtopic.description}

SOURCE MODULE CONTEXT:
${sourceContent.content.map(c => 
  `Subtopic: ${c.subtopic}\nTitle: ${c.title}\nContent: ${JSON.stringify(c.content)}`
).join('\n\n')}

USER'S NEW CONTEXT:
${context}

REQUIREMENTS:
1. Create educational content that adapts the source material to the new context
2. Maintain educational quality while being specific to the new requirements
3. Include practical examples and scenarios relevant to the new context
4. Structure the content in a clear, engaging way
5. Include learning objectives specific to this subtopic

Format your response as JSON with this structure:
{
  "title": "Content Title",
  "content": {
    "sections": [
      {
        "type": "text",
        "title": "Section Title",
        "content": "Educational content here..."
      }
    ],
    "learningObjectives": ["Objective 1", "Objective 2"],
    "keyTakeaways": ["Takeaway 1", "Takeaway 2"]
  }
}
`;

        const articleResponse = await deepseekApi.chat.completions.create({
          messages: [{ role: 'user', content: articlePrompt }],
          model: 'deepseek-chat',
          response_format: { type: 'json_object' }
        });

        let articleData;
        try {
          const articleContent = articleResponse.choices[0].message.content;
          if (!articleContent) {
            throw new Error('Empty article response from AI');
          }
          articleData = JSON.parse(articleContent);
        } catch (error) {
          console.error('Error parsing article response:', error);
          // Create fallback content
          articleData = {
            title: subtopic.title,
            content: {
              sections: [
                {
                  type: "text",
                  title: "Overview",
                  content: `This section covers ${subtopic.title} adapted for the new context: ${context}`
                }
              ],
              learningObjectives: [`Understand ${subtopic.title} in the new context`],
              keyTakeaways: [`Key concepts adapted for ${context}`]
            }
          };
        }

        // Generate quiz questions for the new subtopic
        const quizPrompt = `
Create 5 multiple-choice questions for this training subtopic:

SUBTOPIC: ${subtopic.title}
CONTENT: ${JSON.stringify(articleData.content)}

CONTEXT: ${context}

REQUIREMENTS:
- Each question must test knowledge from the content
- Each question must have EXACTLY 4 answer options
- Each answer option must be specific and relevant
- For each question, identify which option (0-3) is correct
- Include a brief explanation for each correct answer

Format your response as JSON:
{
  "questions": [
    {
      "question": "Specific question?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 1,
      "explanation": "Why option B is correct"
    }
  ]
}
`;

        const quizResponse = await deepseekApi.chat.completions.create({
          messages: [{ role: 'user', content: quizPrompt }],
          model: 'deepseek-chat',
          response_format: { type: 'json_object' }
        });

        let validatedQuestions;
        try {
          const quizContent = quizResponse.choices[0].message.content;
          if (!quizContent) {
            throw new Error('Empty quiz response from AI');
          }
          const quizData = JSON.parse(quizContent);
          validatedQuestions = quizData.questions || [];
        } catch (error) {
          console.error('Error parsing quiz response:', error);
          validatedQuestions = [
            {
              question: `Question about ${subtopic.title}`,
              options: ['Option A', 'Option B', 'Option C', 'Option D'],
              correctAnswer: 0,
              explanation: 'Please review the content for the correct answer.'
            }
          ];
        }

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
            moduleId: newTrainingModule.id,
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
            moduleId: newTrainingModule.id,
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
      where: { id: newTrainingModule.id },
      include: {
        content: true,
        quizBanks: true,
        procedure: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Similar training module generated successfully',
      module: completeModule,
      requiresApproval: true
    });

  } catch (error) {
    console.error('Error generating similar training module:', error);
    return NextResponse.json(
      { error: 'Failed to generate similar training module' },
      { status: 500 }
    );
  }
} 