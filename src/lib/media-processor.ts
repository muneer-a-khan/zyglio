import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export interface MediaProcessingJob {
  mediaItemId: string;
  mediaType: string;
  url: string;
  taskId: string;
}

export interface ProcessingProgress {
  mediaItemId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  stage: string; // e.g., 'downloading', 'extracting_audio', 'transcribing', 'analyzing'
  errorMessage?: string;
}

/**
 * Main function to process uploaded media and extract content
 */
export async function processMediaContent(job: MediaProcessingJob): Promise<void> {
  const { mediaItemId, mediaType, url, taskId } = job;
  
  try {
    // Initialize processing record
    await updateProcessingStatus(mediaItemId, 'processing', 0, 'Starting processing...');

    let extractedContent: ProcessingResult;

    switch (mediaType.toUpperCase()) {
      case 'PDF':
        extractedContent = await processPDF(url, mediaItemId);
        break;
      case 'VIDEO':
        extractedContent = await processVideo(url, mediaItemId);
        break;
      case 'AUDIO':
        extractedContent = await processAudio(url, mediaItemId);
        break;
      case 'IMAGE':
        extractedContent = await processImage(url, mediaItemId);
        break;
      default:
        // Handle URL content (YouTube, etc.)
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
          extractedContent = await processYouTubeVideo(url, mediaItemId);
        } else {
          extractedContent = await processWebContent(url, mediaItemId);
        }
    }

    // Generate summary and key topics using AI
    await updateProcessingStatus(mediaItemId, 'processing', 80, 'Generating summary and topics...');
    const analysis = await analyzeExtractedContent(extractedContent.text);

    // Store the processed content
    await prisma.parsedMediaContent.create({
      data: {
        mediaItemId,
        contentType: extractedContent.contentType,
        extractedText: extractedContent.text,
        summary: analysis.summary,
        keyTopics: analysis.keyTopics,
        processingStatus: 'completed',
        processingTime: Math.floor((Date.now() - extractedContent.startTime) / 1000),
        confidence: extractedContent.confidence,
        metadata: extractedContent.metadata
      }
    });

    await updateProcessingStatus(mediaItemId, 'completed', 100, 'Processing completed successfully');

    // Trigger context enhancement for the task
    await enhanceInterviewContext(taskId);

  } catch (error) {
    console.error(`Error processing media ${mediaItemId}:`, error);
    
    await prisma.parsedMediaContent.upsert({
      where: { mediaItemId },
      create: {
        mediaItemId,
        contentType: 'error',
        extractedText: '',
        processingStatus: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      },
      update: {
        processingStatus: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    });

    await updateProcessingStatus(mediaItemId, 'failed', 0, error instanceof Error ? error.message : 'Processing failed');
  }
}

interface ProcessingResult {
  text: string;
  contentType: string;
  confidence: number;
  metadata: any;
  startTime: number;
}

/**
 * Process PDF files using PDF parsing
 */
async function processPDF(url: string, mediaItemId: string): Promise<ProcessingResult> {
  const startTime = Date.now();
  await updateProcessingStatus(mediaItemId, 'processing', 20, 'Downloading PDF...');

  // Download the PDF
  const response = await fetch(url);
  const pdfBuffer = await response.arrayBuffer();

  await updateProcessingStatus(mediaItemId, 'processing', 40, 'Extracting text from PDF...');

  // Extract text using pdf-parse or similar library
  // For now, we'll use a placeholder approach
  const pdfText = await extractTextFromPDF(pdfBuffer);

  await updateProcessingStatus(mediaItemId, 'processing', 70, 'Processing extracted text...');

  return {
    text: pdfText,
    contentType: 'pdf_text',
    confidence: 0.9,
    metadata: { 
      pageCount: Math.floor(pdfText.length / 2000), // Rough estimate
      extractionMethod: 'pdf-parse'
    },
    startTime
  };
}

/**
 * Process video files - extract audio and get transcript + visual analysis
 */
async function processVideo(url: string, mediaItemId: string): Promise<ProcessingResult> {
  const startTime = Date.now();
  await updateProcessingStatus(mediaItemId, 'processing', 10, 'Downloading video...');

  // Download video
  const videoResponse = await fetch(url);
  const videoBlob = await videoResponse.blob();

  await updateProcessingStatus(mediaItemId, 'processing', 30, 'Extracting audio from video...');

  // Extract audio using FFmpeg (you'd need to implement this)
  const audioBlob = await extractAudioFromVideo(videoBlob);

  await updateProcessingStatus(mediaItemId, 'processing', 50, 'Transcribing audio with Whisper...');

  // Transcribe audio using OpenAI Whisper
  const transcript = await transcribeAudio(audioBlob);

  await updateProcessingStatus(mediaItemId, 'processing', 70, 'Analyzing video frames...');

  // Analyze key video frames for visual content
  const visualAnalysis = await analyzeVideoFrames(videoBlob);

  await updateProcessingStatus(mediaItemId, 'processing', 90, 'Combining analysis...');

  const combinedText = `
AUDIO TRANSCRIPT:
${transcript}

VISUAL CONTENT ANALYSIS:
${visualAnalysis}
  `.trim();

  return {
    text: combinedText,
    contentType: 'video_transcript',
    confidence: 0.85,
    metadata: {
      hasAudio: transcript.length > 0,
      hasVisualContent: visualAnalysis.length > 0,
      transcriptionMethod: 'whisper'
    },
    startTime
  };
}

/**
 * Process YouTube videos
 */
async function processYouTubeVideo(url: string, mediaItemId: string): Promise<ProcessingResult> {
  const startTime = Date.now();
  await updateProcessingStatus(mediaItemId, 'processing', 20, 'Processing YouTube video...');

  // Extract video ID and get transcript using YouTube API or yt-dlp
  const videoId = extractYouTubeVideoId(url);
  
  await updateProcessingStatus(mediaItemId, 'processing', 50, 'Getting YouTube transcript...');

  // Try to get existing captions first, then fall back to Whisper
  let transcript = '';
  try {
    transcript = await getYouTubeTranscript(videoId);
  } catch (error) {
    console.log('No captions available, downloading audio for transcription...');
    const audioBlob = await downloadYouTubeAudio(url);
    transcript = await transcribeAudio(audioBlob);
  }

  await updateProcessingStatus(mediaItemId, 'processing', 80, 'Analyzing video content...');

  // Get video metadata and thumbnail analysis
  const metadata = await getYouTubeMetadata(videoId);
  
  return {
    text: transcript,
    contentType: 'video_transcript',
    confidence: 0.9,
    metadata: {
      platform: 'youtube',
      videoId,
      title: metadata.title,
      duration: metadata.duration,
      transcriptionMethod: 'youtube_captions'
    },
    startTime
  };
}

/**
 * Process audio files
 */
async function processAudio(url: string, mediaItemId: string): Promise<ProcessingResult> {
  const startTime = Date.now();
  await updateProcessingStatus(mediaItemId, 'processing', 20, 'Downloading audio...');

  const audioResponse = await fetch(url);
  const audioBlob = await audioResponse.blob();

  await updateProcessingStatus(mediaItemId, 'processing', 60, 'Transcribing with Whisper...');

  const transcript = await transcribeAudio(audioBlob);

  return {
    text: transcript,
    contentType: 'audio_transcript',
    confidence: 0.9,
    metadata: {
      transcriptionMethod: 'whisper'
    },
    startTime
  };
}

/**
 * Process images using OCR and visual analysis
 */
async function processImage(url: string, mediaItemId: string): Promise<ProcessingResult> {
  const startTime = Date.now();
  await updateProcessingStatus(mediaItemId, 'processing', 30, 'Analyzing image...');

  // Use GPT-4 Vision to analyze the image
  const analysis = await analyzeImageWithGPT4Vision(url);

  await updateProcessingStatus(mediaItemId, 'processing', 70, 'Extracting text with OCR...');

  // Extract any text using OCR (if needed)
  const ocrText = await extractTextFromImage(url);

  const combinedText = `
IMAGE ANALYSIS:
${analysis}

EXTRACTED TEXT:
${ocrText}
  `.trim();

  return {
    text: combinedText,
    contentType: 'image_analysis',
    confidence: 0.8,
    metadata: {
      hasText: ocrText.length > 0,
      analysisMethod: 'gpt4-vision'
    },
    startTime
  };
}

/**
 * Process web content
 */
async function processWebContent(url: string, mediaItemId: string): Promise<ProcessingResult> {
  const startTime = Date.now();
  await updateProcessingStatus(mediaItemId, 'processing', 30, 'Fetching web content...');

  // Fetch and parse web content
  const webContent = await fetchWebPageContent(url);

  await updateProcessingStatus(mediaItemId, 'processing', 70, 'Processing content...');

  return {
    text: webContent,
    contentType: 'web_content',
    confidence: 0.8,
    metadata: {
      url,
      extractionMethod: 'web-scraping'
    },
    startTime
  };
}

/**
 * Analyze extracted content to generate summary and key topics
 */
async function analyzeExtractedContent(text: string): Promise<{summary: string, keyTopics: string[]}> {
  const prompt = `Analyze the following content and provide:
1. A concise summary (2-3 sentences)
2. Key topics/concepts mentioned (as an array)

Content:
${text.substring(0, 4000)}...

Respond in JSON format:
{
  "summary": "...",
  "keyTopics": ["topic1", "topic2", "topic3"]
}`;

  const response = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 500,
    temperature: 0.3
  });

  try {
    return JSON.parse(response.choices[0].message.content || '{"summary":"","keyTopics":[]}');
  } catch {
    return { summary: 'Content processed successfully', keyTopics: [] };
  }
}

/**
 * Update processing status for real-time feedback
 */
async function updateProcessingStatus(
  mediaItemId: string, 
  status: string, 
  progress: number, 
  stage: string
): Promise<void> {
  // This would emit to a WebSocket or SSE connection for real-time updates
  // For now, we'll just log it
  console.log(`Media ${mediaItemId}: ${status} - ${progress}% - ${stage}`);
  
  // You could also store this in a temporary processing status table
  // or use Redis for real-time status updates
}

/**
 * Enhance interview context with parsed media content
 */
async function enhanceInterviewContext(taskId: string): Promise<void> {
  // Get all media items for this task
  const mediaItems = await prisma.mediaItem.findMany({
    where: { taskId },
    include: {
      ParsedMediaContent: true
    }
  });

  const parsedContent = mediaItems
    .map(item => item.ParsedMediaContent)
    .filter(content => content && content.processingStatus === 'completed')
    .map(content => ({
      type: content.contentType,
      summary: content.summary,
      keyTopics: content.keyTopics,
      text: content.extractedText.substring(0, 2000) // Limit length
    }));

  if (parsedContent.length === 0) return;

  // Get existing context
  const existingContext = await prisma.interviewContext.findFirst({
    where: { taskId }
  });

  // Create enhanced context
  const mediaContextSection = `

# UPLOADED MEDIA CONTENT

${parsedContent.map((content, i) => `
## Media ${i + 1} (${content.type})
Summary: ${content.summary}
Key Topics: ${content.keyTopics.join(', ')}

Relevant Content:
${content.text}
`).join('\n')}

---
`;

  const enhancedContext = existingContext 
    ? existingContext.baseContext + mediaContextSection
    : mediaContextSection;

  // Update or create enhanced context
  await prisma.interviewContext.upsert({
    where: { taskId },
    create: {
      taskId,
      baseContext: existingContext?.baseContext || '',
      enhancedContext,
      mediaProcessed: true
    },
    update: {
      enhancedContext,
      mediaProcessed: true,
      lastUpdated: new Date()
    }
  });

  console.log(`Enhanced context for task ${taskId} with ${parsedContent.length} media items`);
}

// Placeholder implementations for media processing functions
// These would need to be implemented with actual libraries

async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  // Implementation with pdf-parse or similar
  return "PDF content extracted...";
}

async function extractAudioFromVideo(videoBlob: Blob): Promise<Blob> {
  // Implementation with FFmpeg.js or similar
  return new Blob();
}

async function transcribeAudio(audioBlob: Blob): Promise<string> {
  // Convert blob to file for OpenAI Whisper
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.wav');
  formData.append('model', 'whisper-1');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: formData
  });

  const result = await response.json();
  return result.text || '';
}

async function analyzeVideoFrames(videoBlob: Blob): Promise<string> {
  // Implementation for video frame analysis
  return "Video frames analyzed...";
}

async function analyzeImageWithGPT4Vision(imageUrl: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze this image in detail. Describe what you see, any text, diagrams, procedures, or instructional content. Focus on information that would be relevant for training or educational purposes."
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl
            }
          }
        ]
      }
    ],
    max_tokens: 1000
  });

  return response.choices[0].message.content || '';
}

async function extractTextFromImage(imageUrl: string): Promise<string> {
  // Implementation with OCR service
  return "OCR text extracted...";
}

async function fetchWebPageContent(url: string): Promise<string> {
  // Implementation with web scraping
  return "Web content extracted...";
}

function extractYouTubeVideoId(url: string): string {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : '';
}

async function getYouTubeTranscript(videoId: string): Promise<string> {
  // Implementation with YouTube Data API
  return "YouTube transcript...";
}

async function downloadYouTubeAudio(url: string): Promise<Blob> {
  // Implementation with yt-dlp or similar
  return new Blob();
}

async function getYouTubeMetadata(videoId: string): Promise<any> {
  // Implementation with YouTube Data API
  return { title: '', duration: 0 };
} 