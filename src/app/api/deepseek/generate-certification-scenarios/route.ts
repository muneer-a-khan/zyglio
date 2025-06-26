import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { moduleTitle, procedureSteps, subtopics, difficulty, targetCount = 3 } = await request.json();

    console.log("DeepSeek generate certification scenarios API route called.");
    
    const apiKey = process.env.DEEPSEEK_API_KEY;
    console.log("DeepSeek API key available:", !!apiKey);

    if (!apiKey) {
      return NextResponse.json(
        { error: 'DeepSeek API key not configured' },
        { status: 500 }
      );
    }

    // Create prompt for generating multiple scenarios
    const prompt = `You are an expert certification designer. Create ${targetCount} distinct certification scenarios for the training module "${moduleTitle}".

TRAINING CONTENT:
Module Title: ${moduleTitle}
Subtopics: ${Array.isArray(subtopics) ? subtopics.map((s: any) => typeof s === 'string' ? s : s.title || s.name).join(', ') : 'None provided'}
Procedure Steps: ${Array.isArray(procedureSteps) ? procedureSteps.join(', ') : 'None provided'}
Difficulty Level: ${difficulty}

REQUIREMENTS:
- Create ${targetCount} unique scenarios that test different aspects of the training
- Each scenario should focus on different competencies and skills
- Scenarios should be realistic, practical situations where this knowledge would be applied
- Include troubleshooting, application, and integration scenarios
- Vary the complexity based on difficulty level: ${difficulty}

For ${difficulty} difficulty:
${difficulty === 'EASY' ? '- Focus on basic application and recall\n- Clear, straightforward scenarios\n- 3-4 questions per scenario' : 
  difficulty === 'NORMAL' ? '- Mix of application and analysis\n- Realistic workplace scenarios\n- 4-5 questions per scenario' :
  '- Complex problem-solving scenarios\n- Multiple interconnected challenges\n- 5-7 questions per scenario'}

Return ONLY a valid JSON object with this exact structure:
{
  "scenarios": [
    {
      "title": "Concise scenario title",
      "description": "Brief 1-2 sentence description of what the trainee will do",
      "context": "Detailed scenario context - the situation they're placed in (2-3 sentences)",
      "expectedCompetencies": ["competency1", "competency2", "competency3"]
    }
  ]
}

Make each scenario distinct and focus on different aspects:
1. First scenario: Practical application in normal conditions
2. Second scenario: Problem-solving when things go wrong  
3. Third scenario: Integration of multiple concepts
${targetCount > 3 ? '4. Fourth scenario: Advanced application or edge cases' : ''}
${targetCount > 4 ? '5. Fifth scenario: Teaching/explaining to others or process improvement' : ''}

Ensure scenarios are relevant to "${moduleTitle}" and test real-world application of the training content.`;

    console.log("Sending request to DeepSeek API...");

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('DeepSeek API error:', response.status, errorData);
      throw new Error(`DeepSeek API request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from DeepSeek API');
    }

    // Parse the JSON response
    let scenariosData;
    try {
      // Clean the response to ensure it's valid JSON
      const cleanedContent = content.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
      scenariosData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse DeepSeek response:', content);
      throw new Error('Invalid JSON response from DeepSeek API');
    }

    // Validate the response structure
    if (!scenariosData.scenarios || !Array.isArray(scenariosData.scenarios)) {
      throw new Error('Invalid scenarios structure in DeepSeek response');
    }

    // Ensure we have the right number of scenarios
    if (scenariosData.scenarios.length < targetCount) {
      console.warn(`DeepSeek returned ${scenariosData.scenarios.length} scenarios, expected ${targetCount}`);
    }

    console.log(`✅ Generated ${scenariosData.scenarios.length} certification scenarios successfully`);

    return NextResponse.json({
      success: true,
      scenarios: scenariosData.scenarios.slice(0, targetCount), // Ensure we don't exceed target count
      metadata: {
        difficulty,
        targetCount,
        actualCount: scenariosData.scenarios.length
      }
    });

  } catch (error) {
    console.error('Error in DeepSeek certification scenarios generation:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate certification scenarios',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 