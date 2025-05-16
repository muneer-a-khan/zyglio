import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import * as yaml from 'js-yaml';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { transcript } = await request.json();

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    const sampleYaml = `procedure_name: Lumbar Spinal Fusion
purpose: To stabilize the spine, reduce pain and nerve irritation, prevent further degeneration, protect nerves from compression, and restore spinal strength, improving patient quality of life.
stages:
    - Incision: A midline or lateral incision is made over the affected vertebrae.
    - Exposure: Muscles and tissues are retracted to access the spine.
    - Disc Excision: The intervertebral disc is removed if necessary.
    - Graft Placement: Autograft, allograft, or synthetic bone graft material is placed between the vertebrae.
    - Stabilization: Vertebrae are secured with screws, rods, or cages to provide stability.
    - Closure: The incision is sutured in layers and dressed.
considerations:
    - pre-operative:
        - Confirm the source of instability, deformity, or pain with imaging (MRI, CT, X-ray).
        - Assess the patient's medical history and risks.
        - General anesthesia is administered.
    - intra-operative:
        - Minimize tissue damage during incision and muscle retraction.
        - Avoid excessive bone removal during disc excision.
        - Select the appropriate bone graft type.
        - Position implants carefully.
        - Verify proper screw placement with intraoperative imaging to avoid nerve or vessel injury.
        - Ensure adequate decompression of spinal nerves.
        - Control bleeding.
    - post-operative:
        - Monitor for complications such as bleeding, infection, or nerve damage.
        - Implement physical therapy and gradual activity resumption.
        - Monitor bone healing with periodic imaging.
goals:
    - Stabilize the spine.
    - Alleviate chronic back or leg pain.
    - Restore proper spinal alignment.
    - Halt the worsening of adjacent spinal structures.
    - Enhance mobility and quality of life.
    - Relieve pressure on spinal nerves.
    - Provide long-term structural support to the lower back.`;

    const prompt = `I need you to create a detailed YAML representation of a medical or technical procedure following this exact structure:

${sampleYaml}

Here is the transcript that needs to be formatted into this structure:

${transcript}

Please generate a well-structured YAML with:
1. An appropriate procedure_name based on the transcript
2. A detailed purpose statement
3. The stages section should include each major step with a descriptive title followed by a colon and explanation
4. Comprehensive pre-operative, intra-operative, and post-operative considerations
5. Relevant goals
6. Include at least one decision point if appropriate for the procedure

Your response should be ONLY the YAML, with no additional text, explanations, or markdown. Start directly with "procedure_name:" and ensure proper YAML formatting with correct indentation.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a medical procedure documentation expert that converts transcripts into structured YAML format. Always ensure your output is valid YAML that can be parsed by standard YAML parsers."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    let generatedYaml = completion.choices[0].message.content || '';
    
    // Clean up the YAML string
    generatedYaml = generatedYaml.trim();
    
    // Validate the YAML by attempting to parse it
    try {
      const parsed = yaml.load(generatedYaml);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid YAML structure');
      }
      
      // Check for required fields
      if (!('procedure_name' in parsed) || !('stages' in parsed)) {
        throw new Error('Missing required fields in YAML');
      }
      
      return NextResponse.json({ yaml: generatedYaml });
    } catch (error) {
      console.error('YAML validation error:', error);
      console.error('Generated YAML:', generatedYaml);
      
      return NextResponse.json(
        { error: 'Generated YAML is invalid' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error generating YAML:', error);
    return NextResponse.json(
      { error: 'Failed to generate YAML' },
      { status: 500 }
    );
  }
} 