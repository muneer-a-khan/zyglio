// Simple script to generate voice questions for all modules
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Check environment variables
console.log('Environment variables loaded:');
console.log('DEEPSEEK_API_KEY present:', !!process.env.DEEPSEEK_API_KEY);
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
console.log('DIRECT_URL present:', !!process.env.DIRECT_URL);

// DeepSeek API helper
function getDeepSeekApi() {
  const OpenAI = require('openai');
  
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable is not set. DeepSeek features will not work.');
  }

  // Store the original OPENAI_API_KEY if it exists
  const originalOpenAIKey = process.env.OPENAI_API_KEY;
  
  // Temporarily set a dummy OPENAI_API_KEY to bypass validation
  if (!originalOpenAIKey) {
    process.env.OPENAI_API_KEY = 'dummy-key-for-deepseek-initialization';
  }
  
  try {
    // Create the client with the DeepSeek API key
    return new OpenAI({
      baseURL: 'https://api.deepseek.com/v1',
      apiKey: apiKey,
    });
  } finally {
    // Restore the original environment or delete the dummy key
    if (!originalOpenAIKey) {
      delete process.env.OPENAI_API_KEY;
    }
  }
}

// Generate questions using DeepSeek API
async function generateQuestionsWithDeepSeek(module, difficulty) {
  try {
    console.log(`Attempting to generate ${difficulty} questions for module: ${module.title}`);
    
    const deepseekApi = getDeepSeekApi();
    
    // Parse subtopics from JSON
    let subtopics = '';
    try {
      if (typeof module.subtopics === 'string') {
        const parsedSubtopics = JSON.parse(module.subtopics);
        if (Array.isArray(parsedSubtopics)) {
          subtopics = parsedSubtopics.map(t => typeof t === 'object' ? (t.title || '') : t).join(', ');
        }
      } else if (Array.isArray(module.subtopics)) {
        subtopics = module.subtopics.map(t => typeof t === 'object' ? (t.title || '') : t).join(', ');
      }
    } catch (e) {
      console.log('Error parsing subtopics:', e);
      subtopics = 'General knowledge';
    }

    console.log(`Using subtopics: ${subtopics}`);
    console.log(`Using procedure: ${module.procedure?.title || 'Unknown Procedure'}`);
    console.log('Calling DeepSeek API...');

    const questionPrompt = `
Generate voice interview questions for certification in: ${module.title}

Procedure: ${module.procedure?.title || 'Unknown Procedure'}
Subtopics: ${subtopics}
Interview Difficulty: ${difficulty}
Interview Duration: ~15 minutes

Generate 15-20 questions of varying difficulty that cover all key competency areas:
1. Factual knowledge questions
2. Scenario-based questions  
3. Safety and compliance questions
4. Problem-solving questions
5. Best practices questions

Format as JSON array with this structure:
{
  "questions": [
    {
      "id": "q1",
      "type": "factual|scenario|safety|problem_solving|best_practice",
      "difficulty": "${difficulty.toLowerCase()}",
      "question": "Question text here?",
      "expectedKeywords": ["keyword1", "keyword2"],
      "competencyArea": "specific area",
      "points": 5,
      "scoringCriteria": {
        "excellent": "Criteria for 5 points",
        "good": "Criteria for 3-4 points", 
        "adequate": "Criteria for 2 points",
        "poor": "Criteria for 1 point"
      }
    }
  ]
}
`;

    console.log('Sending prompt to DeepSeek API...');
    
    const questionsResponse = await deepseekApi.chat.completions.create({
      messages: [{ role: 'user', content: questionPrompt }],
      model: 'deepseek-chat',
      response_format: { type: 'json_object' }
    });
    
    console.log('Received response from DeepSeek API');
    
    const responseContent = questionsResponse.choices[0]?.message?.content;
    if (!responseContent) {
      console.error('Empty response from DeepSeek API');
      throw new Error('Empty response from DeepSeek API');
    }
    
    console.log('Parsing response...');
    const parsedResponse = JSON.parse(responseContent);
    const questions = parsedResponse.questions || [];
    console.log(`Successfully generated ${questions.length} questions`);
    
    return questions;
  } catch (error) {
    console.error('Error generating questions with DeepSeek:', error);
    console.log('Falling back to default questions...');
    return generateFallbackQuestions(module, difficulty);
  }
}

// Generate fallback questions if DeepSeek fails
function generateFallbackQuestions(module, difficulty) {
  const subtopics = Array.isArray(module.subtopics) ? module.subtopics : [];
  const difficultyLower = difficulty.toLowerCase();
  
  const questions = [
    {
      id: 'q1',
      type: 'factual',
      difficulty: difficultyLower,
      question: `Can you explain the main purpose of the ${module.title} procedure?`,
      expectedKeywords: ['procedure', 'purpose', 'objective'],
      competencyArea: 'Basic Understanding',
      points: 5,
      scoringCriteria: {
        excellent: 'Clear explanation with all key points',
        good: 'Good explanation with most key points',
        adequate: 'Basic explanation with some key points',
        poor: 'Incomplete or unclear explanation'
      }
    },
    {
      id: 'q2', 
      type: 'scenario',
      difficulty: difficultyLower,
      question: `Describe a situation where you would need to follow this procedure and walk me through the key steps.`,
      expectedKeywords: ['steps', 'process', 'sequence'],
      competencyArea: 'Practical Application',
      points: 8,
      scoringCriteria: {
        excellent: 'Comprehensive scenario with correct steps',
        good: 'Good scenario with mostly correct steps',
        adequate: 'Basic scenario with some correct steps',
        poor: 'Unclear scenario or incorrect steps'
      }
    },
    {
      id: 'q3',
      type: 'safety',
      difficulty: difficultyLower,
      question: 'What safety considerations should be kept in mind when following this procedure?',
      expectedKeywords: ['safety', 'precautions', 'risks'],
      competencyArea: 'Safety Awareness',
      points: 7,
      scoringCriteria: {
        excellent: 'Identifies all major safety considerations',
        good: 'Identifies most safety considerations',
        adequate: 'Identifies basic safety considerations',
        poor: 'Limited or no safety awareness'
      }
    }
  ];

  // Add more questions based on subtopics
  subtopics.forEach((subtopic, index) => {
    if (index < 5) { // Limit to 5 additional questions
      questions.push({
        id: `q${questions.length + 1}`,
        type: 'factual',
        difficulty: difficultyLower,
        question: `Tell me about ${subtopic.title || subtopic} and its importance in this procedure.`,
        expectedKeywords: [subtopic.title || subtopic, 'importance', 'role'],
        competencyArea: subtopic.title || subtopic,
        points: 5,
        scoringCriteria: {
          excellent: 'Thorough understanding and explanation',
          good: 'Good understanding with minor gaps',
          adequate: 'Basic understanding',
          poor: 'Limited or incorrect understanding'
        }
      });
    }
  });

  return questions;
}

// Generate questions for a module
async function generateQuestionsForModule(moduleId, force = false) {
  try {
    // Get the module with procedure
    const module = await prisma.trainingModule.findUnique({
      where: { id: moduleId },
      include: {
        procedure: true,
        voiceQuestionBanks: true
      }
    });

    if (!module) {
      console.error(`Module not found: ${moduleId}`);
      return false;
    }

    // Generate questions for each difficulty level
    const difficulties = ['EASY', 'NORMAL', 'HARD'];
    let generatedCount = 0;

    for (const difficulty of difficulties) {
      // Check if questions already exist for this difficulty
      const existingBank = module.voiceQuestionBanks.find(bank => bank.difficulty === difficulty);
      
      if (existingBank && !force) {
        console.log(`Questions already exist for module ${moduleId} with difficulty ${difficulty}`);
        continue;
      }

      // Generate questions using DeepSeek
      const questions = await generateQuestionsWithDeepSeek(module, difficulty);
      
      if (questions.length === 0) {
        console.error(`Failed to generate questions for module ${moduleId} with difficulty ${difficulty}`);
        continue;
      }

      // Save or update the question bank
      if (existingBank) {
        await prisma.voiceQuestionBank.update({
          where: { id: existingBank.id },
          data: {
            questions,
            updatedAt: new Date()
          }
        });
      } else {
        await prisma.voiceQuestionBank.create({
          data: {
            moduleId,
            difficulty,
            questions
          }
        });
      }

      generatedCount++;
    }

    return generatedCount > 0;
  } catch (error) {
    console.error('Error generating questions for module:', error);
    return false;
  }
}

// Main function
async function generateVoiceQuestions() {
  try {
    console.log('Starting voice question generation...');
    
    // Parse command line arguments
    // When running with npm, arguments come after --
    const npmIndex = process.argv.indexOf('--');
    const args = npmIndex !== -1 
      ? process.argv.slice(npmIndex + 1) 
      : process.argv.slice(2);
    
    console.log('Command arguments:', args);
    
    const forceRegenerate = args.includes('--force');
    const moduleIdArg = args.find(arg => arg.startsWith('--moduleId='));
    const moduleId = moduleIdArg ? moduleIdArg.split('=')[1] : null;
    
    console.log('Force regenerate:', forceRegenerate);
    console.log('Module ID:', moduleId);
    
    if (forceRegenerate) {
      console.log('Force regeneration mode enabled - will regenerate all questions');
    }
    
    if (moduleId) {
      console.log(`Processing single module with ID: ${moduleId}`);
      
      // Get specific module
      const module = await prisma.trainingModule.findUnique({
        where: { id: moduleId },
        include: {
          procedure: true,
          voiceQuestionBanks: true
        }
      });
      
      if (!module) {
        console.error(`Module not found with ID: ${moduleId}`);
        return;
      }
      
      console.log(`Generating questions for module: ${module.id} - ${module.title}`);
      
      try {
        const result = await generateQuestionsForModule(module.id, forceRegenerate);
        console.log(`Question generation for module ${module.id}: ${result ? 'Success' : 'Skipped (already exists)'}`);
      } catch (error) {
        console.error(`Error generating questions for module ${module.id}:`, error);
      }
    } else {
      // Get all training modules
      const modules = await prisma.trainingModule.findMany();
      console.log(`Found ${modules.length} training modules`);
      
      // Generate questions for each module
      for (const module of modules) {
        console.log(`Generating questions for module: ${module.id} - ${module.title}`);
        
        try {
          const result = await generateQuestionsForModule(module.id, forceRegenerate);
          console.log(`Question generation for module ${module.id}: ${result ? 'Success' : 'Skipped (already exists)'}`);
        } catch (error) {
          console.error(`Error generating questions for module ${module.id}:`, error);
        }
        
        // Wait a bit between API calls to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('Voice question generation completed');
  } catch (error) {
    console.error('Error in voice question generation script:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
generateVoiceQuestions()
  .then(() => console.log('Script completed'))
  .catch(error => console.error('Script failed:', error)); 