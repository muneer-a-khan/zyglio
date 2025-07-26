# Media Upload Feature for Hume AI Assistant

## Overview

The Media Upload Feature allows users to enhance their Hume AI voice assistant's knowledge base by uploading various types of media files (documents, videos, audio, images) and custom text. The system processes these files using Google Gemini AI to extract and summarize content, then updates the Hume AI assistant's prompt with this new knowledge.

## Features

- **Multi-format Support**: Upload PDFs, Word documents, text files, videos, audio files, and images
- **AI-powered Content Extraction**: Uses Google Gemini 2.0 Flash Exp to analyze and summarize content
- **Real-time Processing**: Immediate feedback on upload progress and content extraction
- **Custom Context**: Add additional text context alongside uploaded files
- **Automatic Prompt Updates**: Creates new prompt versions and assigns them to your config
- **Visual Feedback**: Shows extracted content for review before updating
- **Error Handling**: Robust error handling for various file types and API limits

## How to Use

1. **Navigate to the Demo Page**: Go to `/demo` in your application
2. **Upload Media Files**: 
   - Click "Choose Files" to select documents, videos, or audio files
   - Click "Upload" to process the files
   - Wait for content extraction to complete
3. **Add Custom Context** (Optional):
   - Enter additional text in the "Add Custom Context" field
   - This will be combined with the extracted content
4. **Review Extracted Content**:
   - View the full extracted summary in the preview section
   - Scroll through the content to verify accuracy
5. **Update AI Knowledge**:
   - Click "Update AI Knowledge" to create a new prompt version
   - The system will automatically assign the new prompt to your config
   - Your assistant will immediately use the updated knowledge

## Technical Implementation

### File Processing Flow

```
Upload Files → Gemini Processing → Content Extraction → Prompt Enhancement → Config Update
```

### Supported File Types

- **Documents**: PDF, DOC, DOCX, TXT
- **Videos**: MP4, AVI, MOV
- **Audio**: MP3, WAV
- **Images**: JPG, JPEG, PNG

### API Endpoints

- **`/api/hume/upload-media`**: Handles file uploads and Gemini processing
- **`/api/hume/update-prompt`**: Creates new prompt versions and updates config

### Content Processing

The system uses Google Gemini 2.0 Flash Exp to:
- **Extract text** from PDFs and Word documents
- **Transcribe and summarize** audio files
- **Analyze video content** and extract key information
- **Process images** for text and visual content
- **Create comprehensive summaries** of all uploaded content

### Prompt Update Process

1. **Fetch Current Prompt**: Retrieves the existing Zyglio Enhanced Assistant prompt
2. **Create Enhanced Version**: Combines original prompt with new content
3. **Create New Version**: Uses Hume AI's create-prompt-version endpoint
4. **Update Config**: Automatically assigns the new prompt version to your config
5. **Immediate Activation**: Your assistant starts using the new knowledge immediately

## Error Handling

### Rate Limiting
- **Gemini API Limits**: Handles 429 Too Many Requests errors gracefully
- **Fallback Messages**: Provides informative error messages when processing fails
- **Retry Logic**: Built-in retry mechanisms for transient failures

### File Processing Errors
- **Video Processing**: Handles video analysis failures with fallback messages
- **Large Files**: Manages memory efficiently for large file uploads
- **Unsupported Formats**: Clear error messages for unsupported file types

### Network Issues
- **Timeout Handling**: Configurable timeouts for API calls
- **Connection Errors**: Graceful degradation when services are unavailable

## Security

- **File Validation**: Validates file types and sizes before processing
- **Temporary Storage**: Files are processed in memory and cleaned up immediately
- **API Key Protection**: All API keys are stored securely in environment variables
- **Content Sanitization**: Extracted content is sanitized before prompt injection

## Performance

- **Parallel Processing**: Multiple files can be processed simultaneously
- **Efficient Memory Usage**: Files are processed in chunks to manage memory
- **Caching**: Extracted content is cached to avoid reprocessing
- **Optimized API Calls**: Minimizes API calls through batch processing

## Future Enhancements

- **Batch Upload**: Support for uploading multiple files at once
- **Content Categories**: Organize uploaded content by topic or category
- **Version History**: Track and manage different prompt versions
- **Content Search**: Search through uploaded content for specific information
- **Integration APIs**: Connect with external knowledge bases and databases

## Troubleshooting

### Common Issues

1. **Upload Button Not Visible**
   - Ensure you're on the `/demo` page
   - Check that the Hume AI voice chat component is loaded

2. **File Processing Fails**
   - Verify file format is supported
   - Check file size (recommended < 50MB)
   - Ensure Google AI API key is configured

3. **Prompt Not Updating**
   - Check browser console for error messages
   - Verify Hume AI API keys are correct
   - Ensure config ID is properly set

4. **Rate Limit Errors**
   - Wait a few minutes before retrying
   - Reduce file size or number of files
   - Check Google AI API quota usage

### Debug Information

The system provides detailed logging for troubleshooting:
- File processing status and progress
- API call responses and error details
- Prompt update confirmation
- Config assignment verification

## Configuration

### Environment Variables

```env
GOOGLE_AI_API_KEY=your_google_ai_api_key
HUME_API_KEY=your_hume_api_key
HUME_SECRET_KEY=your_hume_secret_key
NEXT_PUBLIC_HUME_CONFIG_ID=your_config_id
```

### Component Props

```typescript
interface MediaUploadPanelProps {
  onPromptUpdated?: (newPrompt: string) => void;
}
```

## Integration Notes

- **Hume AI SDK**: Uses official `@humeai/voice-react` SDK for voice interactions
- **Google Gemini**: Leverages Gemini 2.0 Flash Exp for advanced content analysis
- **Next.js App Router**: Built with Next.js 15 and App Router architecture
- **TypeScript**: Fully typed implementation for better development experience 