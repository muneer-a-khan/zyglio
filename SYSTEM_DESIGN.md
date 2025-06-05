# Unified Zyglio Platform - System Design & Architecture

## Executive Summary

This document outlines the system design and architecture for merging the **Zyglio Voice Procedural Craftsman** (Next.js-based training platform) with the **Objects-Scenarios** (Vite/React-based scenario builder) into a unified, comprehensive training and simulation platform.

## Current State Analysis

### Zyglio (Voice Procedural Craftsman)
- **Framework**: Next.js 14 with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Key Features**:
  - Voice recording and transcription
  - Task definition with KPIs
  - Media library management
  - AI-driven interviews with RAG system
  - YAML generation and flowchart visualization
  - Simulation building capabilities

### Objects-Scenarios
- **Framework**: Vite + React with TypeScript
- **Database**: Supabase (PostgreSQL)
- **Key Features**:
  - Smart object definition system
  - Interactive scenario flow builder
  - Trigger logic editor
  - Preview and simulation modes
  - Mobile-responsive design
  - Training scenario creation

## Unified Architecture

### 1. Technology Stack

#### Frontend
- **Framework**: Next.js 14 (migrating from Vite)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **State Management**: React Context + Zustand for complex state
- **Form Handling**: React Hook Form with Zod validation

#### Backend
- **API**: Next.js API Routes
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **AI Integration**: DeepSeek API / OpenAI

#### DevOps & Deployment
- **Package Manager**: npm (standardizing from mixed npm/bun)
- **Hosting**: Vercel (Next.js native)
- **Database**: Supabase hosted PostgreSQL
- **Storage**: Supabase Storage for media files

### 2. Core Module Integration

#### Module 1: Enhanced Learning Task Management
**Merged Functionality**:
- Zyglio's task definition system
- Objects-Scenarios' scenario planning
- Unified task creation workflow

**Features**:
- Task definition with KPIs and objectives
- Smart object library integration
- Scenario flow planning
- Media attachments and resource management

#### Module 2: Smart Object & Scenario Builder
**Merged Functionality**:
- Objects-Scenarios' object definition system
- Enhanced with Zyglio's media library
- AI-powered object suggestions

**Components**:
- Object definition panel with categories (Ingredient, Tool, Equipment, Person, Location)
- Object state management and behavior definition
- Scenario flow builder with drag-and-drop interface
- Trigger logic editor for object interactions

#### Module 3: Voice-Enhanced Procedure Creation
**Merged Functionality**:
- Zyglio's voice recording and transcription
- Objects-Scenarios' step-by-step scenario building
- AI-powered content enhancement

**Features**:
- Voice recording with automatic transcription
- AI-powered clarifications and suggestions
- Object-aware procedure steps
- Real-time validation against defined objects

#### Module 4: Unified Simulation Engine
**Merged Functionality**:
- Zyglio's simulation building capabilities
- Objects-Scenarios' preview and interaction modes
- Enhanced trigger system

**Components**:
- Interactive simulation environment
- Object state tracking and triggers
- Voice-guided simulations
- Performance analytics and feedback

### 3. Database Schema Integration

#### New Unified Schema Structure

```sql
-- Enhanced Learning Tasks
CREATE TABLE learning_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR NOT NULL,
  description TEXT,
  kpi_tech VARCHAR,
  kpi_concept VARCHAR,
  presenter VARCHAR NOT NULL,
  affiliation VARCHAR,
  date TIMESTAMPTZ NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Smart Objects System
CREATE TABLE smart_objects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL,
  category VARCHAR NOT NULL CHECK (category IN ('Ingredient', 'Tool', 'Equipment', 'Person', 'Location')),
  attributes JSONB DEFAULT '{}',
  states TEXT[] DEFAULT '{}',
  behaviors TEXT[] DEFAULT '{}',
  signals TEXT[] DEFAULT '{}',
  current_state VARCHAR,
  task_id UUID REFERENCES learning_tasks(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced Scenario Steps
CREATE TABLE scenario_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  procedure_id UUID REFERENCES procedures(id),
  instruction TEXT NOT NULL,
  required_objects UUID[] DEFAULT '{}',
  required_actions TEXT[] DEFAULT '{}',
  conditions TEXT[] DEFAULT '{}',
  feedback TEXT,
  position JSONB, -- {x: number, y: number}
  step_index INTEGER NOT NULL,
  is_checkpoint BOOLEAN DEFAULT false,
  expected_responses JSONB DEFAULT '[]',
  voice_recording_url VARCHAR,
  transcript TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger System
CREATE TABLE triggers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  object_id UUID REFERENCES smart_objects(id),
  signal VARCHAR NOT NULL,
  condition TEXT NOT NULL,
  action TEXT NOT NULL,
  scenario_id UUID REFERENCES procedures(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced Simulations
CREATE TABLE simulations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES learning_tasks(id),
  name VARCHAR NOT NULL,
  settings JSONB DEFAULT '{}',
  is_voice_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Simulation Sessions & Analytics
CREATE TABLE simulation_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulation_id UUID REFERENCES simulations(id),
  user_id UUID REFERENCES users(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  score INTEGER,
  performance_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. API Architecture

#### RESTful API Endpoints

```typescript
// Learning Tasks
GET    /api/tasks
POST   /api/tasks
GET    /api/tasks/[id]
PUT    /api/tasks/[id]
DELETE /api/tasks/[id]

// Smart Objects
GET    /api/tasks/[taskId]/objects
POST   /api/tasks/[taskId]/objects
PUT    /api/objects/[id]
DELETE /api/objects/[id]

// Scenarios & Procedures
GET    /api/tasks/[taskId]/scenarios
POST   /api/tasks/[taskId]/scenarios
GET    /api/scenarios/[id]
PUT    /api/scenarios/[id]
DELETE /api/scenarios/[id]

// Scenario Steps
GET    /api/scenarios/[scenarioId]/steps
POST   /api/scenarios/[scenarioId]/steps
PUT    /api/steps/[id]
DELETE /api/steps/[id]

// Triggers
GET    /api/scenarios/[scenarioId]/triggers
POST   /api/scenarios/[scenarioId]/triggers
PUT    /api/triggers/[id]
DELETE /api/triggers/[id]

// Simulations
GET    /api/simulations
POST   /api/simulations
GET    /api/simulations/[id]
PUT    /api/simulations/[id]
DELETE /api/simulations/[id]
POST   /api/simulations/[id]/start
POST   /api/simulations/[id]/complete

// Voice & Media
POST   /api/voice/upload
POST   /api/voice/transcribe
POST   /api/media/upload
GET    /api/media/[id]

// AI Services
POST   /api/ai/interview
POST   /api/ai/suggestions
POST   /api/ai/enhance-scenario
```

### 5. Component Architecture

#### Page-Level Components (Next.js App Router)

```
src/app/
├── page.tsx                    # Landing page
├── auth/
│   ├── login/page.tsx
│   └── register/page.tsx
├── dashboard/page.tsx          # Main dashboard
├── tasks/
│   ├── page.tsx               # Task list
│   ├── [id]/page.tsx          # Task details
│   └── create/page.tsx        # Task creation
├── scenarios/
│   ├── [id]/
│   │   ├── page.tsx           # Scenario overview
│   │   ├── builder/page.tsx   # Scenario builder
│   │   ├── objects/page.tsx   # Object management
│   │   └── triggers/page.tsx  # Trigger editor
└── simulations/
    ├── page.tsx               # Simulation list
    ├── [id]/page.tsx          # Simulation runner
    └── analytics/page.tsx     # Performance analytics
```

#### Shared Components

```
src/components/
├── ui/                        # Shadcn UI components
├── layout/
│   ├── header.tsx
│   ├── sidebar.tsx
│   └── footer.tsx
├── tasks/
│   ├── task-form.tsx
│   ├── task-card.tsx
│   └── task-list.tsx
├── objects/
│   ├── object-definition-panel.tsx
│   ├── object-library.tsx
│   ├── object-edit-dialog.tsx
│   └── smart-object-card.tsx
├── scenarios/
│   ├── scenario-flow-builder.tsx
│   ├── scenario-step-editor.tsx
│   ├── trigger-logic-editor.tsx
│   └── flow-visualization.tsx
├── voice/
│   ├── voice-recorder.tsx
│   ├── transcription-display.tsx
│   └── audio-player.tsx
├── simulations/
│   ├── simulation-runner.tsx
│   ├── preview-mode.tsx
│   ├── performance-tracker.tsx
│   └── feedback-system.tsx
├── media/
│   ├── media-library.tsx
│   ├── media-uploader.tsx
│   └── media-viewer.tsx
└── ai/
    ├── ai-interview.tsx
    ├── suggestion-panel.tsx
    └── enhancement-suggestions.tsx
```

### 6. State Management Strategy

#### Global State (Zustand)

```typescript
interface AppState {
  // User & Auth
  user: User | null;
  isAuthenticated: boolean;
  
  // Current Context
  currentTask: LearningTask | null;
  currentScenario: Scenario | null;
  
  // Builder State
  objects: SmartObject[];
  scenarioSteps: ScenarioStep[];
  triggers: Trigger[];
  
  // UI State
  isPreviewMode: boolean;
  selectedObjects: string[];
  canvasViewport: { x: number; y: number; zoom: number };
  
  // Actions
  setCurrentTask: (task: LearningTask) => void;
  addObject: (object: SmartObject) => void;
  updateObject: (id: string, updates: Partial<SmartObject>) => void;
  deleteObject: (id: string) => void;
  addScenarioStep: (step: ScenarioStep) => void;
  updateScenarioStep: (id: string, updates: Partial<ScenarioStep>) => void;
  // ... more actions
}
```

### 7. Integration Phases

#### Phase 1: Foundation Migration (Prompts 1-2)
- ✅ **COMPLETED**: Created unified TypeScript interfaces (`src/types/unified.ts`)
- ✅ **COMPLETED**: Migrated Object Definition Panel (`src/components/objects/object-definition-panel.tsx`)
- ✅ **COMPLETED**: Migrated Object Library component (`src/components/objects/object-library.tsx`)
- ✅ **COMPLETED**: Migrated Scenario Flow Builder (`src/components/scenarios/scenario-flow-builder.tsx`)
- 🔄 **IN PROGRESS**: Migrate remaining Objects-Scenarios components to Next.js 14
- ⏳ **TODO**: Standardize component architecture and naming conventions
- ⏳ **TODO**: Integrate Supabase authentication
- ⏳ **TODO**: Set up unified database schema

**Progress**: 3/5 core components migrated

### Components Completed This Session:
1. **Unified Types System** - Complete type definitions for both platforms
2. **Object Definition Panel** - Create and configure smart objects with states, behaviors, signals
3. **Object Library** - Display, manage, and interact with defined objects
4. **Scenario Flow Builder** - Visual step-by-step scenario creation with object integration

### Key Integration Features Implemented:
- ✅ Object-aware scenario building (steps can reference specific SmartObjects)
- ✅ Voice recording placeholders integrated into scenario steps
- ✅ Unified form validation with Zod schemas
- ✅ Consistent UI/UX patterns across components
- ✅ Mobile-responsive design considerations

#### Phase 2: Core Feature Integration (Prompts 3-4)
- Merge object definition systems
- Integrate voice recording with scenario building
- Implement unified task management
- Connect AI interview system with object awareness

#### Phase 3: Advanced Features (Prompts 5-6)
- Enhanced simulation engine with trigger system
- Real-time collaboration features
- Advanced analytics and reporting
- Performance optimization

#### Phase 4: Polish & Launch (Prompts 7-8)
- Mobile responsiveness improvements
- Comprehensive testing
- Documentation and user guides
- Production deployment

### 8. Data Flow Architecture

#### Scenario Creation Flow
1. **Task Definition**: User creates learning task with objectives
2. **Object Definition**: Define smart objects with properties and behaviors
3. **Scenario Building**: Create scenario flow using defined objects
4. **Voice Enhancement**: Record voice instructions for each step
5. **Trigger Configuration**: Set up object interaction triggers
6. **AI Enhancement**: AI suggests improvements and validates logic
7. **Simulation Ready**: Complete scenario ready for simulation

#### Simulation Execution Flow
1. **Session Initialization**: Load scenario, objects, and user context
2. **State Tracking**: Monitor object states and user interactions
3. **Trigger Processing**: Execute triggers based on conditions
4. **Voice Guidance**: Provide audio instructions and feedback
5. **Progress Tracking**: Record performance metrics
6. **Completion Analysis**: Generate performance report

### 9. Performance Considerations

#### Optimization Strategies
- **Lazy Loading**: Load scenario components on demand
- **Virtual Scrolling**: For large object libraries
- **Image Optimization**: Next.js Image component for media
- **Edge Caching**: Static content via Vercel Edge Network
- **Database Optimization**: Proper indexing and query optimization

#### Scalability Features
- **Horizontal Scaling**: Stateless API design
- **Caching Strategy**: Redis for session data and frequent queries
- **CDN Integration**: Media file distribution
- **Background Processing**: Queue system for heavy operations

### 10. Security & Privacy

#### Authentication & Authorization
- **Multi-factor Authentication**: Via Supabase Auth
- **Role-based Access Control**: Admin, Instructor, Trainee roles
- **API Security**: JWT tokens with proper validation
- **Data Encryption**: At rest and in transit

#### Privacy Compliance
- **GDPR Compliance**: User data management and deletion
- **Voice Data Protection**: Secure handling of audio recordings
- **Anonymous Analytics**: Privacy-focused performance tracking

### 11. Monitoring & Analytics

#### Application Monitoring
- **Error Tracking**: Sentry integration
- **Performance Monitoring**: Web Vitals tracking
- **User Analytics**: Privacy-compliant usage analytics
- **Database Monitoring**: Query performance and optimization

#### Business Intelligence
- **Learning Analytics**: Training effectiveness metrics
- **Usage Patterns**: Feature adoption and user behavior
- **Performance Insights**: Simulation completion rates and scores

## Conclusion

This unified architecture creates a comprehensive training platform that combines the best of both applications:

- **Zyglio's** strength in voice-driven content creation and AI-powered interviews
- **Objects-Scenarios'** intuitive visual scenario building and object management

The result is a powerful, scalable platform for creating immersive, voice-enhanced training simulations with intelligent object interactions and comprehensive analytics.

The phased migration approach ensures minimal disruption while maximizing the value of existing code and maintaining development velocity. 