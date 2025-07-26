import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Google AI SDK for Gemini
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json(
        { error: 'Google AI API key not configured' },
        { status: 500 }
      );
    }

    let allExtractedContent = '';
    const processedFiles: string[] = [];

    for (const file of files) {
      try {
        console.log(`Processing file: ${file.name}`);
        
        // Create uploads directory if it doesn't exist
        const uploadsDir = join(process.cwd(), 'uploads');
        if (!existsSync(uploadsDir)) {
          await mkdir(uploadsDir, { recursive: true });
        }

        // Save file temporarily
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filePath = join(uploadsDir, file.name);
        await writeFile(filePath, buffer);

        // Extract content based on file type
        const extractedContent = await extractContentFromFile(file, buffer);
        allExtractedContent += `\n\n--- Content from ${file.name} ---\n${extractedContent}`;
        processedFiles.push(file.name);

        // Clean up temporary file
        try {
          await unlink(filePath);
        } catch (cleanupError) {
          console.warn(`Could not delete temporary file ${filePath}:`, cleanupError);
        }

        console.log(`Successfully processed: ${file.name}`);
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        allExtractedContent += `\n\n--- Error processing ${file.name} ---\nCould not extract content from this file: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    // Use Gemini to summarize and structure the extracted content
    let summarizedContent = '';
    if (allExtractedContent.trim()) {
      try {
        summarizedContent = await summarizeWithGemini(allExtractedContent);
      } catch (error) {
        console.error('Error summarizing with Gemini:', error);
        summarizedContent = allExtractedContent; // Fallback to original content
      }
    }

    return NextResponse.json({
      content: summarizedContent,
      message: `Successfully processed ${processedFiles.length} file(s)`,
      filesProcessed: processedFiles.length,
      processedFileNames: processedFiles
    });

  } catch (error) {
    console.error('Error in upload-media:', error);
    return NextResponse.json(
      { error: 'Failed to process uploaded files' },
      { status: 500 }
    );
  }
}

async function extractContentFromFile(file: File, buffer: Buffer): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  try {
    // Text files
    if (fileType.startsWith('text/') || fileName.endsWith('.txt')) {
      return buffer.toString('utf-8');
    }

    // PDF files - use Gemini's native PDF processing
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return await extractFromPDFWithGemini(buffer, fileName);
    }

    // Word documents - use Gemini's native Word document processing
    if (fileType.includes('word') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
      return await extractFromWordDocumentWithGemini(buffer, fileName);
    }

    // Images
    if (fileType.startsWith('image/') || fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) {
      return await extractFromImage(buffer, fileType);
    }

    // Audio files - use Gemini's audio transcription
    if (fileType.startsWith('audio/') || fileName.match(/\.(mp3|wav|m4a|aac|ogg|flac)$/)) {
      return await extractFromAudioWithGemini(buffer, fileName);
    }

    // Video files - extract frames and analyze as image sequence
    if (fileType.startsWith('video/') || fileName.match(/\.(mp4|avi|mov|mkv|webm|flv)$/)) {
      return await extractFromVideoWithGemini(buffer, fileName);
    }

    // Default: try to extract as text
    return buffer.toString('utf-8');

  } catch (error) {
    console.error(`Error extracting content from ${file.name}:`, error);
    return `[Could not extract content from ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
}

async function extractFromPDFWithGemini(buffer: Buffer, fileName: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    // Create file data for Gemini to process directly
    const fileData = {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: 'application/pdf'
      }
    };

    const prompt = `Please analyze this PDF document and provide a comprehensive summary of its content.

    Please:
    1. Extract and summarize all readable text content from this PDF
    2. Identify key topics, concepts, and important information
    3. Extract any structured data, lists, tables, or important details
    4. Provide a comprehensive summary that captures the main points
    5. Focus on information that would be valuable for an AI assistant's knowledge base

    Please provide a detailed, well-structured summary of the actual content found in this PDF.`;

    const result = await model.generateContent([prompt, fileData]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('PDF processing error:', error);
    
    // Check if it's a rate limit error
    if (error instanceof Error && error.message && error.message.includes('429')) {
      return `[PDF Analysis - ${fileName} - Rate Limited]
      
      Note: Gemini API rate limit reached. This PDF has been uploaded and will be available for reference.
      The AI assistant will be aware that this PDF contains relevant information for the current context.
      
      File Information:
      - Name: ${fileName}
      - Size: ${(buffer.length / 1024).toFixed(2)} KB
      - Format: PDF document`;
    }
    
    // Fallback for other errors
    return `[PDF Analysis - ${fileName}]
    
    File Information:
    - Name: ${fileName}
    - Size: ${(buffer.length / 1024).toFixed(2)} KB
    - Format: PDF document
    
    Note: PDF content analysis was not available. This PDF has been uploaded and can be referenced in conversations.`;
  }
}

async function extractFromWordDocumentWithGemini(buffer: Buffer, fileName: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    // Create file data for Gemini to process directly
    const fileData = {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }
    };

    const prompt = `Please analyze this Word document and provide a comprehensive summary of its content.

    Please:
    1. Extract and summarize all readable text content from this Word document
    2. Identify key topics, concepts, and important information
    3. Extract any structured data, lists, tables, or important details
    4. Provide a comprehensive summary that captures the main points
    5. Focus on information that would be valuable for an AI assistant's knowledge base

    Please provide a detailed, well-structured summary of the actual content found in this Word document.`;

    const result = await model.generateContent([prompt, fileData]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Word document processing error:', error);
    
    // Check if it's a rate limit error
    if (error instanceof Error && error.message && error.message.includes('429')) {
      return `[Word Document Analysis - ${fileName} - Rate Limited]
      
      Note: Gemini API rate limit reached. This Word document has been uploaded and will be available for reference.
      The AI assistant will be aware that this document contains relevant information for the current context.
      
      File Information:
      - Name: ${fileName}
      - Size: ${(buffer.length / 1024).toFixed(2)} KB
      - Format: Word document`;
    }
    
    // Fallback for other errors
    return `[Word Document Analysis - ${fileName}]
    
    File Information:
    - Name: ${fileName}
    - Size: ${(buffer.length / 1024).toFixed(2)} KB
    - Format: Word document
    
    Note: Word document content analysis was not available. This document has been uploaded and can be referenced in conversations.`;
  }
}

async function extractFromImage(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    // Use Gemini Vision to extract text and describe image content
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    const imageData = {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: mimeType
      }
    };

    const prompt = `Please analyze this image and provide a comprehensive summary of its content. 

    Please:
    1. Extract and transcribe any text visible in the image
    2. Describe any diagrams, charts, graphs, or visual elements
    3. Identify key information, data points, or concepts shown
    4. Summarize the main message or purpose of the image
    5. Focus on information that would be valuable for an AI assistant's knowledge base

    Provide a detailed, well-structured summary that captures all the important information from this image.`;

    const result = await model.generateContent([prompt, imageData]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error extracting from image:', error);
    return `[Image content - ${buffer.length} bytes - could not analyze with AI]`;
  }
}

async function extractFromAudioWithGemini(buffer: Buffer, fileName: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    // Create audio file data for Gemini to process directly
    const audioData = {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: 'audio/mpeg' // Adjust based on actual file type
      }
    };

    const prompt = `Please transcribe and analyze this audio file to provide a comprehensive summary.

    Please:
    1. Transcribe the spoken content from this audio file
    2. Identify key topics, concepts, and important information discussed
    3. Provide a comprehensive summary that captures the main points
    4. Extract any important quotes, instructions, or details mentioned
    5. Focus on information that would be valuable for an AI assistant's knowledge base

    Please provide a detailed, well-structured summary of the actual spoken content in this audio file.`;

    const result = await model.generateContent([prompt, audioData]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Audio processing error:', error);
    
    // Check if it's a rate limit error
    if (error instanceof Error && error.message && error.message.includes('429')) {
      return `[Audio Analysis - ${fileName} - Rate Limited]
      
      Note: Gemini API rate limit reached. This audio file has been uploaded and will be available for reference.
      The AI assistant will be aware that this audio contains relevant information for the current context.
      
      File Information:
      - Name: ${fileName}
      - Size: ${(buffer.length / 1024).toFixed(2)} KB
      - Format: Audio file`;
    }
    
    // Fallback for other errors
    return `[Audio Analysis - ${fileName}]
    
    File Information:
    - Name: ${fileName}
    - Size: ${(buffer.length / 1024).toFixed(2)} KB
    - Format: Audio file
    
    Note: Audio content analysis was not available. This audio file has been uploaded and can be referenced in conversations.`;
  }
}

async function extractFromVideoWithGemini(buffer: Buffer, fileName: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    // Create video file data for Gemini to process directly
    const videoData = {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: 'video/mp4' // Adjust based on actual file type
      }
    };

    const prompt = `Please analyze this video file and provide a comprehensive summary of its content.

    Please:
    1. Extract and transcribe any spoken content from this video
    2. Describe the visual content, scenes, and any text or graphics shown
    3. Identify key topics, concepts, and important information presented
    4. Provide a comprehensive summary that captures the main points
    5. Extract any important instructions, demonstrations, or details
    6. Focus on information that would be valuable for an AI assistant's knowledge base

    Please provide a detailed, well-structured summary of the actual content in this video file.`;

    const result = await model.generateContent([prompt, videoData]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Video processing error:', error);
    
    // Fallback: Provide a basic analysis based on file metadata
    const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
    return `[Video Analysis - ${fileName}]
    
    File Information:
    - Name: ${fileName}
    - Size: ${fileSizeMB} MB
    - Format: Video file
    
    Note: Direct video content analysis was not available. This video file has been uploaded and can be referenced in conversations. The AI assistant will be aware that this video contains relevant information for the current context.
    
    To get detailed analysis of this video content, please consider:
    1. Converting the video to audio and uploading the audio file separately
    2. Extracting key frames as images and uploading those
    3. Providing a text description of the video content in the custom context field`;
  }
}

async function summarizeWithGemini(content: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    const prompt = `Please analyze and summarize the following content extracted from various media files. 
    Create a comprehensive, well-structured summary that would be useful for an AI assistant's knowledge base.
    Focus on key information, facts, concepts, and insights. Organize the content logically and remove any redundant information.
    
    If the content contains errors or placeholders indicating processing issues, note these clearly.
    
    Content to summarize:
    ${content}
    
    Please provide a clear, concise summary that captures the essential information.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error summarizing with Gemini:', error);
    
    // Check if it's a rate limit error
    if (error instanceof Error && error.message && error.message.includes('429')) {
      return `[Summary - Rate Limited]
      
      Note: Gemini API rate limit reached. The uploaded content has been processed and is available for reference.
      The AI assistant will be aware of the uploaded files and their context.
      
      Original content:
      ${content}`;
    }
    
    // Return original content if summarization fails
    return content;
  }
} 