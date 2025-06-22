# Voice Certification Training System - Setup Guide

This guide explains how to access and use the new voice certification training system.

## Quick Start

### 1. Navigation
The training system is accessible through the main navigation bar:
- **Training** - View available training modules and your progress
- **Review Training** - (SME/Admin only) Review and approve AI-generated training content

### 2. Workflow Overview

#### For SMEs (Subject Matter Experts):
1. **Create Procedure** → Go to "New Procedure" and create your procedure as usual
2. **Generate Training** → On the procedure detail page, click "Generate Training" button
3. **Review Content** → Go to "Review Training" to approve the AI-generated content
4. **Publish** → Once approved, trainees can access the training

#### For Trainees:
1. **Browse Training** → Go to "Training" to see all available modules
2. **Take Training** → Complete articles, quizzes, and interactive content
3. **Voice Certification** → Take the adaptive voice interview to get certified
4. **Track Progress** → View your progress, scores, and certifications

## User Roles

### Setting User Roles
To set a user as an SME, you need to update the database directly:

```sql
UPDATE "User" SET role = 'sme' WHERE email = 'sme@example.com';
```

Available roles:
- `trainee` (default) - Can take training and get certified
- `sme` - Can create procedures, review training content, and approve modules
- `admin` - Full access to all features

## Features

### Training Content Generation
- AI automatically generates training modules from procedure steps
- Creates articles, quizzes, and interactive content
- Detects subtopics and creates structured learning paths

### Quiz Types
- Multiple choice questions
- Fill-in-the-blank
- True/false questions
- Short answer questions
- Interactive drag-and-drop exercises
- Scenario simulations

### Voice Certification
- 15-minute adaptive voice interviews
- Questions adapt based on quiz performance
- AI scoring using OpenAI and ElevenLabs
- Pass/fail certification with detailed feedback

### Analytics & Progress Tracking
- Time spent on each module
- Quiz attempt history and scores
- Voice interview confidence scores
- Certification status and dates
- Detailed competency assessments

## API Endpoints

### Training Management
- `POST /api/training/generate` - Generate training from procedure
- `GET /api/training/modules` - List training modules
- `GET /api/training/modules/[id]` - Get module details
- `POST /api/training/quiz/[id]/attempt` - Submit quiz attempt

### Voice Certification
- `POST /api/certification/voice-interview/start` - Start voice interview
- Voice processing with real-time transcription and scoring

### SME Review
- `GET /api/sme/training/pending` - Get pending training content for review
- Content approval workflow with editing capabilities

## Database Schema

The system adds several new tables:
- `TrainingModule` - Links procedures to training content
- `TrainingContent` - Stores articles and interactive elements
- `QuizBank` - Question bank organized by subtopics
- `QuizAttempt` - User quiz attempts with detailed scoring
- `Certification` - Voice certification records
- `TrainingProgress` - Detailed progress tracking
- `CertificationAnalytics` - Comprehensive analytics

## Getting Started

1. **Create a procedure** using the existing procedure creation flow
2. **Set yourself as SME** by updating your user role in the database
3. **Generate training** by clicking the "Generate Training" button on any procedure
4. **Review and approve** the generated content in the SME review interface
5. **Take training** as a trainee to test the full workflow

## Technical Notes

- All content is pre-generated and stored in the database for fast loading
- Voice processing uses ElevenLabs for TTS and OpenAI Whisper for transcription
- Adaptive interview system adjusts difficulty based on quiz performance
- Rich content rendering supports markdown, safety notes, and key points
- Responsive design works on desktop and mobile devices

## Troubleshooting

### Common Issues
1. **"Generate Training" button not working** - Check that the procedure has valid steps and content
2. **SME features not visible** - Ensure your user role is set to 'sme' or 'admin'
3. **Voice interview not starting** - Check browser permissions for microphone access
4. **Training content not appearing** - Ensure content has been approved by an SME

### Environment Variables Required
- `DEEPSEEK_API_KEY` - For AI content generation
- `OPENAI_API_KEY` - For voice transcription and scoring
- `ELEVENLABS_API_KEY` - For text-to-speech in voice interviews
- Standard Supabase and database connection variables

## Support

For technical issues or questions about the training system, check the implementation in:
- `/src/app/training/` - Training dashboard and module pages
- `/src/components/training/` - Training components
- `/src/app/api/training/` - Training API endpoints
- `/src/app/api/certification/` - Voice certification endpoints 