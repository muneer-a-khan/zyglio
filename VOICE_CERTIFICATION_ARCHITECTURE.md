# Voice Certification System - Technical Architecture

## System Overview

The Voice Certification System extends the existing Zyglio platform to provide AI-generated training modules and voice-based certification for uploaded procedures. The system creates educational content from procedures, allows SME review/approval, and provides adaptive voice interviews for certification.

## Database Schema Changes

### New Models to Add to schema.prisma

```prisma
model TrainingModule {
  id            String               @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  procedureId   String               @db.Uuid
  title         String
  subtopics     Json                 // Array of subtopic objects with titles and descriptions
  isApproved    Boolean              @default(false)
  approvedAt    DateTime?            @db.Timestamptz(6)
  approvedBy    String?              @db.Uuid
  createdAt     DateTime             @default(now()) @db.Timestamptz(6)
  updatedAt     DateTime             @updatedAt @db.Timestamptz(6)
  version       Int                  @default(1)
  
  procedure     Procedure            @relation(fields: [procedureId], references: [id], onDelete: Cascade)
  approver      User?                @relation("ModuleApprover", fields: [approvedBy], references: [id])
  content       TrainingContent[]
  quizBanks     QuizBank[]
  certifications Certification[]
  progress      TrainingProgress[]
  
  @@index([procedureId])
  @@index([isApproved])
}

model TrainingContent {
  id            String               @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  moduleId      String               @db.Uuid
  subtopic      String               // Which subtopic this content belongs to
  contentType   TrainingContentType
  title         String
  content       Json                 // Rich content object (text, interactive elements, etc.)
  orderIndex    Int
  estimatedTime Int                  // Minutes to complete
  createdAt     DateTime             @default(now()) @db.Timestamptz(6)
  
  module        TrainingModule       @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  
  @@index([moduleId])
  @@index([subtopic])
}

model QuizBank {
  id            String               @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  moduleId      String               @db.Uuid
  subtopic      String
  questions     Json                 // Array of question objects
  passingScore  Int                  @default(80) // Percentage
  createdAt     DateTime             @default(now()) @db.Timestamptz(6)
  
  module        TrainingModule       @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  attempts      QuizAttempt[]
  
  @@index([moduleId])
  @@index([subtopic])
}

model QuizAttempt {
  id            String               @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  userId        String               @db.Uuid
  quizBankId    String               @db.Uuid
  answers       Json                 // User's answers
  score         Int                  // Percentage score
  passed        Boolean
  timeSpent     Int                  // Seconds
  attemptNumber Int
  completedAt   DateTime             @default(now()) @db.Timestamptz(6)
  
  user          User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  quizBank      QuizBank             @relation(fields: [quizBankId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([quizBankId])
  @@index([completedAt])
}

model Certification {
  id                    String               @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  userId                String               @db.Uuid
  moduleId              String               @db.Uuid
  procedureId           String               @db.Uuid
  status                CertificationStatus  @default(NOT_STARTED)
  quizScore             Int?                 // Average quiz score
  voiceInterviewScore   Json?                // Detailed voice interview scores
  overallScore          Int?                 // Final certification score
  passed                Boolean              @default(false)
  certifiedAt           DateTime?            @db.Timestamptz(6)
  voiceInterviewData    Json?                // Interview transcript, questions, etc.
  competencyScores      Json?                // Scores per competency area
  adaptiveDifficulty    String?              // EASY, NORMAL, HARD based on quiz performance
  
  user                  User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  module                TrainingModule       @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  procedure             Procedure            @relation(fields: [procedureId], references: [id], onDelete: Cascade)
  analytics             CertificationAnalytics[]
  
  @@unique([userId, moduleId]) // One certification per user per module
  @@index([userId])
  @@index([moduleId])
  @@index([status])
  @@index([certifiedAt])
}

model TrainingProgress {
  id                String               @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  userId            String               @db.Uuid
  moduleId          String               @db.Uuid
  currentSubtopic   String?
  completedSubtopics Json                @default("[]") // Array of completed subtopic names
  timeSpent         Int                  @default(0) // Total seconds spent
  lastAccessedAt    DateTime             @default(now()) @db.Timestamptz(6)
  progressPercentage Int                 @default(0)
  
  user              User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  module            TrainingModule       @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  
  @@unique([userId, moduleId])
  @@index([userId])
  @@index([moduleId])
}

model CertificationAnalytics {
  id                String               @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  certificationId   String               @db.Uuid
  userId            String               @db.Uuid
  moduleId          String               @db.Uuid
  eventType         AnalyticsEventType
  eventData         Json                 // Flexible event data
  timestamp         DateTime             @default(now()) @db.Timestamptz(6)
  
  certification     Certification        @relation(fields: [certificationId], references: [id], onDelete: Cascade)
  
  @@index([certificationId])
  @@index([userId])
  @@index([moduleId])
  @@index([eventType])
  @@index([timestamp])
}

// Enums
enum TrainingContentType {
  ARTICLE
  INTERACTIVE_QUIZ
  DRAG_DROP
  SCENARIO_SIMULATION
  VIDEO_CONTENT
}

enum CertificationStatus {
  NOT_STARTED
  IN_PROGRESS
  QUIZ_COMPLETED
  VOICE_INTERVIEW_SCHEDULED
  VOICE_INTERVIEW_IN_PROGRESS
  COMPLETED
  FAILED
}

enum AnalyticsEventType {
  TRAINING_STARTED
  CONTENT_VIEWED
  QUIZ_ATTEMPTED
  QUIZ_PASSED
  QUIZ_FAILED
  VOICE_INTERVIEW_STARTED
  VOICE_INTERVIEW_COMPLETED
  CERTIFICATION_ACHIEVED
  CERTIFICATION_FAILED
}
```

### Schema Updates for Existing Models

```prisma
// Add to User model
model User {
  // ... existing fields
  certifications           Certification[]
  quizAttempts             QuizAttempt[]
  trainingProgress         TrainingProgress[]
  approvedModules          TrainingModule[] @relation("ModuleApprover")
}

// Add to Procedure model
model Procedure {
  // ... existing fields
  trainingModules          TrainingModule[]
  certifications           Certification[]
}
```

## API Architecture

### New API Routes

```
/api/training/
├── generate/                    # Auto-generate training content
├── modules/
│   ├── [moduleId]/
│   │   ├── route.ts            # Get module details
│   │   ├── approve/            # SME approve/reject module
│   │   ├── content/            # Get/update module content
│   │   └── subtopics/          # Update subtopics
│   └── route.ts                # List modules
├── content/
│   ├── [contentId]/            # Get/update specific content
│   └── interactive/            # Interactive content handlers
├── quiz/
│   ├── [quizId]/
│   │   ├── attempt/            # Submit quiz attempt
│   │   └── results/            # Get quiz results
│   └── generate/               # Generate quiz questions
└── progress/
    ├── [userId]/               # User progress tracking
    └── update/                 # Update progress

/api/certification/
├── voice-interview/
│   ├── start/                  # Initialize adaptive voice interview
│   ├── process/                # Process interview responses
│   └── complete/               # Complete and score interview
├── status/                     # Get certification status
├── dashboard/                  # User certification dashboard
└── analytics/                  # Certification analytics

/api/sme/
├── training/
│   ├── pending/                # Pending approvals
│   ├── analytics/              # SME analytics dashboard
│   └── settings/               # Module settings (passing scores, etc.)
└── procedures/
    └── [procedureId]/training/ # Training content for specific procedure
```

## Component Architecture

### Training Components

```typescript
// Core Training Components
src/components/training/
├── training-module-viewer.tsx          # Main training interface
├── content-renderer.tsx               # Renders different content types
├── interactive/
│   ├── embedded-quiz.tsx              # Quiz within articles
│   ├── drag-drop-exercise.tsx         # Drag and drop interactions
│   ├── scenario-simulation.tsx        # Scenario-based simulations
│   └── progress-tracker.tsx           # Progress visualization
├── quiz/
│   ├── quiz-interface.tsx             # Quiz taking interface
│   ├── quiz-results.tsx               # Results display
│   └── quiz-retry.tsx                 # Retry failed quizzes
└── navigation/
    ├── subtopic-navigation.tsx        # Navigate between subtopics
    └── training-breadcrumbs.tsx       # Training progress breadcrumbs
```

### Certification Components

```typescript
// Certification Components
src/components/certification/
├── adaptive-voice-certification.tsx   # Adaptive voice interview
├── certification-dashboard.tsx        # User certification overview
├── certification-card.tsx            # Individual certification display
├── competency-scores.tsx             # Detailed competency breakdown
└── voice-interview/
    ├── adaptive-interview-engine.tsx  # Core interview logic
    ├── difficulty-scaler.tsx          # Handles question difficulty scaling
    └── scoring-engine.tsx             # Interview scoring algorithms
```

### SME Management Components

```typescript
// SME Components
src/components/sme/
├── training-approval/
│   ├── content-review-panel.tsx       # Review generated content
│   ├── subtopic-editor.tsx           # Edit subtopics before generation
│   ├── content-editor.tsx            # Edit generated content
│   └── approval-dashboard.tsx        # SME approval dashboard
├── analytics/
│   ├── sme-analytics-dashboard.tsx   # SME analytics overview
│   ├── procedure-performance.tsx     # Performance per procedure
│   ├── trainee-progress.tsx          # Individual trainee progress
│   └── certification-trends.tsx      # Certification trends
└── settings/
    ├── module-settings.tsx           # Configure passing scores, etc.
    └── notification-preferences.tsx  # SME notification settings
```

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
1. **Database Schema Implementation**
   - Add new models to Prisma schema
   - Run migrations
   - Update existing models

2. **Core API Endpoints**
   - Training content generation API
   - Module management APIs
   - Basic progress tracking

3. **Basic Components**
   - Training module viewer
   - Content renderer for articles
   - Basic progress tracking

### Phase 2: Content Generation (Weeks 3-4)
1. **AI Content Generation**
   - Subtopic extraction from procedures
   - Article generation using DeepSeek API
   - Quiz question generation
   - Interactive content templates

2. **SME Approval System**
   - Subtopic editing interface
   - Content review and approval
   - Content editor for SME modifications

3. **Quiz System**
   - Quiz interface
   - Scoring system
   - Retry logic with 80% threshold

### Phase 3: Interactive Content (Weeks 5-6)
1. **Interactive Elements**
   - Embedded quizzes within articles
   - Drag and drop exercises
   - Scenario simulations
   - Progress visualization

2. **Enhanced Training Experience**
   - Subtopic navigation
   - Content completion tracking
   - Time tracking

### Phase 4: Voice Certification (Weeks 7-8)
1. **Adaptive Voice Interview**
   - Extend existing voice interview system
   - Difficulty scaling based on quiz performance
   - Competency-based scoring
   - Curved scoring algorithm

2. **Certification Management**
   - Certification status tracking
   - Certificate generation
   - Certification dashboard

### Phase 5: Analytics & Dashboard (Weeks 9-10)
1. **Trainee Dashboard**
   - Certification overview
   - Progress tracking
   - Performance metrics

2. **SME Analytics**
   - Procedure performance analytics
   - Trainee progress monitoring
   - Success rate tracking

3. **Advanced Features**
   - Content versioning on procedure updates
   - Bulk content regeneration
   - Advanced reporting

## Technical Implementation Details

### Content Generation Algorithm

```typescript
// Pseudo-code for content generation
async function generateTrainingModule(procedureId: string) {
  1. Extract procedure content and steps
  2. Use DeepSeek API to identify subtopics:
     - Analyze procedure for logical learning chunks
     - Generate subtopic titles and descriptions
     - Map procedure steps to subtopics
  
  3. For each subtopic:
     - Generate educational article (1000-2000 words)
     - Create embedded quiz questions (5-10 per subtopic)
     - Design interactive exercises based on content type
     - Generate scenario simulations where applicable
  
  4. Create quiz bank:
     - Generate 20-30 questions per subtopic
     - Mix question types (MCQ, True/False, Fill-in-blank)
     - Set difficulty levels for adaptive testing
  
  5. Store all content in database for approval
}
```

### Adaptive Voice Interview Algorithm

```typescript
// Voice interview adaptation logic
function calculateInterviewDifficulty(quizScores: number[]): InterviewConfig {
  const avgScore = quizScores.reduce((a, b) => a + b) / quizScores.length;
  
  if (avgScore >= 95) {
    return {
      difficulty: 'HARD',
      passingThreshold: 70, // Easier threshold for harder questions
      questionTypes: ['advanced', 'scenario-based', 'troubleshooting']
    };
  } else if (avgScore >= 85) {
    return {
      difficulty: 'NORMAL',
      passingThreshold: 75,
      questionTypes: ['intermediate', 'application', 'analysis']
    };
  } else {
    return {
      difficulty: 'EASY',
      passingThreshold: 80,
      questionTypes: ['basic', 'recall', 'comprehension']
    };
  }
}
```

### Data Flow Architecture

```
1. SME uploads procedure → Existing workflow
2. Auto-generate subtopics → DeepSeek API
3. SME reviews/edits subtopics → SME Interface
4. Generate training content → DeepSeek API batch processing
5. SME approves content → Training goes live
6. Trainee accesses training → Progress tracking begins
7. Complete quizzes → Adaptive difficulty calculation
8. Voice certification → Adaptive interview based on quiz performance
9. Certification issued → Analytics updated
10. SME views analytics → Performance insights
```

## Integration Points

### With Existing System
- **Procedure Upload**: Hook into existing procedure creation workflow
- **Voice Interview**: Extend existing voice interview component
- **User Management**: Use existing user roles and authentication
- **Media**: Leverage existing media upload/management for interactive content

### External APIs
- **DeepSeek**: Content generation and analysis
- **OpenAI Whisper**: Voice transcription (existing)
- **ElevenLabs**: Text-to-speech (existing)

## Security & Performance Considerations

### Security
- SME-only access to content approval
- Role-based permissions for analytics
- Secure storage of voice interview data
- Content versioning and audit trails

### Performance
- Pre-generate all content to minimize latency
- Cache frequently accessed training modules
- Optimize quiz delivery for mobile devices
- Background processing for analytics calculations

## Next Steps

1. **Database Migration**: Implement the new schema
2. **API Development**: Start with core training APIs
3. **Component Development**: Begin with basic training viewer
4. **Testing Strategy**: Unit tests for content generation logic
5. **SME Feedback Loop**: Early testing with SME users

This architecture provides a comprehensive, scalable foundation for your voice certification system while integrating seamlessly with your existing Zyglio platform. 