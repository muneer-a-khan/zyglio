import { NextRequest, NextResponse } from 'next/server';

const HUME_API_URL = 'https://api.hume.ai/v0/evi/prompts';
const HUME_CONFIG_URL = 'https://api.hume.ai/v0/evi/configs';

export async function POST(request: NextRequest) {
  try {
    const { content, description } = await request.json();
    
    if (!content) {
      return NextResponse.json(
        { error: 'No content provided' },
        { status: 400 }
      );
    }

    const apiKey = process.env.HUME_API_KEY;
    const secretKey = process.env.HUME_SECRET_KEY;
    const configId = process.env.NEXT_PUBLIC_HUME_CONFIG_ID;

    if (!apiKey || !secretKey) {
      return NextResponse.json(
        { error: 'Hume API keys not configured' },
        { status: 500 }
      );
    }

    if (!configId) {
      return NextResponse.json(
        { error: 'Hume config ID not configured' },
        { status: 500 }
      );
    }

    console.log('🔍 Starting prompt update process...');
    console.log('📋 Config ID:', configId);

    // First, get the current config to understand its structure
    console.log('📡 Fetching current config...');
    const getConfigResponse = await fetch(`${HUME_CONFIG_URL}/${configId}`, {
      headers: {
        'X-Hume-Api-Key': apiKey,
        'X-Hume-Secret-Key': secretKey,
      },
    });

    console.log('📊 Get config response status:', getConfigResponse.status);

    if (!getConfigResponse.ok) {
      const configErrorData = await getConfigResponse.text();
      console.error('❌ Failed to fetch current config:', configErrorData);
      return NextResponse.json(
        { 
          error: 'Failed to fetch current configuration',
          details: configErrorData,
          status: getConfigResponse.status
        },
        { status: 500 }
      );
    }

    const currentConfig = await getConfigResponse.json();
    console.log('✅ Current config fetched successfully:', {
      configId: currentConfig.id,
      name: currentConfig.name,
      voice: currentConfig.voice,
      eviVersion: currentConfig.evi_version
    });
    
    // Add detailed logging to see the full response
    console.log('🔍 Full config response:', JSON.stringify(currentConfig, null, 2));

    // Use the existing Zyglio Enhanced Assistant prompt ID
    const existingPromptId = '5ba72392-9a67-455d-abbd-431b3fe7a02f';
    console.log('📋 Using existing prompt ID:', existingPromptId);

    // Get the current prompt to understand its structure
    console.log('📡 Fetching current prompt...');
    const getPromptResponse = await fetch(`${HUME_API_URL}/${existingPromptId}`, {
      headers: {
        'X-Hume-Api-Key': apiKey,
        'X-Hume-Secret-Key': secretKey,
      },
    });

    console.log('📊 Prompt response status:', getPromptResponse.status);

    if (!getPromptResponse.ok) {
      const promptErrorData = await getPromptResponse.text();
      console.error('❌ Failed to fetch current prompt:', promptErrorData);
      console.error('📊 Prompt response headers:', Object.fromEntries(getPromptResponse.headers.entries()));
      return NextResponse.json(
        { 
          error: 'Failed to fetch current prompt',
          details: promptErrorData,
          status: getPromptResponse.status
        },
        { status: 500 }
      );
    }

    const currentPrompt = await getPromptResponse.json();
    console.log('✅ Current prompt fetched successfully:', {
      promptId: currentPrompt.id,
      version: currentPrompt.version,
      name: currentPrompt.name
    });

    // Create enhanced prompt with the new content
    const enhancedPrompt = createEnhancedPrompt(currentPrompt.text, content);
    console.log('📝 Enhanced prompt created, length:', enhancedPrompt.length);

    // Create a new version of the existing prompt using the Hume AI API
    console.log('📡 Creating new prompt version...');
    const createVersionResponse = await fetch(`${HUME_API_URL}/${existingPromptId}`, {
      method: 'POST',
      headers: {
        'X-Hume-Api-Key': apiKey,
        'X-Hume-Secret-Key': secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: enhancedPrompt,
        version_description: description || 'Enhanced with uploaded media content for improved knowledge base'
      }),
    });

    console.log('📊 Create version response status:', createVersionResponse.status);
    console.log('📊 Create version response headers:', Object.fromEntries(createVersionResponse.headers.entries()));

    if (!createVersionResponse.ok) {
      const errorData = await createVersionResponse.text();
      console.error('❌ Hume API error:', errorData);
      console.error('📊 Response status:', createVersionResponse.status);
      console.error('📊 Response headers:', Object.fromEntries(createVersionResponse.headers.entries()));
      
      return NextResponse.json(
        { 
          error: 'Failed to create new prompt version',
          details: errorData,
          status: createVersionResponse.status
        },
        { status: 500 }
      );
    }

    const newPromptVersion = await createVersionResponse.json();

    console.log('✅ New prompt version created successfully:', {
      promptId: newPromptVersion.id,
      version: newPromptVersion.version,
      name: newPromptVersion.name,
      versionDescription: newPromptVersion.version_description
    });

    // Now create a new config version that uses the new prompt version
    console.log('📡 Creating new config version with updated prompt...');
    
    // Prepare the config body with fallback values
    const configBody: any = {
      evi_version: currentConfig.evi_version || "3",
      version_description: `Updated to use prompt version ${newPromptVersion.version} with enhanced knowledge`,
      prompt: {
        id: newPromptVersion.id,
        version: newPromptVersion.version
      }
    };
    
    // Add voice if available, otherwise use a default
    if (currentConfig.voice) {
      configBody.voice = currentConfig.voice;
    } else {
      // Use a default Hume AI voice
      configBody.voice = {
        provider: "HUME_AI",
        name: "Ava Song"
      };
    }
    
    // Add other config settings if available
    if (currentConfig.language_model) {
      configBody.language_model = currentConfig.language_model;
    }
    if (currentConfig.ellm_model) {
      configBody.ellm_model = currentConfig.ellm_model;
    }
    if (currentConfig.event_messages) {
      configBody.event_messages = currentConfig.event_messages;
    }
    if (currentConfig.timeouts) {
      configBody.timeouts = currentConfig.timeouts;
    }
    
    console.log('📋 Config body to send:', JSON.stringify(configBody, null, 2));
    
    const createConfigVersionResponse = await fetch(`${HUME_CONFIG_URL}/${configId}`, {
      method: 'POST',
      headers: {
        'X-Hume-Api-Key': apiKey,
        'X-Hume-Secret-Key': secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(configBody),
    });

    console.log('📊 Create config version response status:', createConfigVersionResponse.status);
    console.log('📊 Create config version response headers:', Object.fromEntries(createConfigVersionResponse.headers.entries()));

    if (!createConfigVersionResponse.ok) {
      const configErrorData = await createConfigVersionResponse.text();
      console.error('❌ Failed to create config version:', configErrorData);
      console.error('📊 Config response status:', createConfigVersionResponse.status);
      console.error('📊 Config response headers:', Object.fromEntries(createConfigVersionResponse.headers.entries()));
      
      return NextResponse.json(
        { 
          error: 'Failed to create config version with new prompt',
          details: configErrorData,
          status: createConfigVersionResponse.status
        },
        { status: 500 }
      );
    }

    const newConfigVersion = await createConfigVersionResponse.json();

    console.log('✅ New config version created successfully:', {
      configId: newConfigVersion.id,
      version: newConfigVersion.version,
      promptId: newConfigVersion.prompt?.id,
      promptVersion: newConfigVersion.prompt?.version
    });

    return NextResponse.json({
      success: true,
      message: 'New prompt version created and config updated successfully! Your assistant will now use the updated knowledge.',
      promptId: newPromptVersion.id,
      promptVersion: newPromptVersion.version,
      configId: newConfigVersion.id,
      configVersion: newConfigVersion.version,
      updatedContent: enhancedPrompt
    });

  } catch (error) {
    console.error('❌ Error creating new prompt version:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create new prompt version',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function createEnhancedPrompt(originalPrompt: string, newContent: string): string {
  // Create an enhanced version of the original prompt that includes the new content
  const enhancedPrompt = `${originalPrompt}

ADDITIONAL KNOWLEDGE BASE:
The following information has been uploaded and processed to enhance my knowledge:

${newContent}

INSTRUCTIONS FOR USING UPLOADED KNOWLEDGE:
- When users ask questions related to the uploaded content, use this knowledge to provide accurate and detailed responses
- Reference specific information from the uploaded content when relevant
- If the uploaded content contains procedures, guidelines, or specific instructions, follow them precisely
- Maintain your original personality and behavior while incorporating this new knowledge
- If asked about topics not covered in the uploaded content, fall back to your general knowledge
- Always acknowledge when you're using information from the uploaded content
- Provide comprehensive answers that leverage both your general knowledge and the uploaded content

Remember: This additional knowledge enhances my ability to help users with specific topics and information from their uploaded materials. Use it to provide more accurate, relevant, and helpful responses.`;

  return enhancedPrompt;
} 