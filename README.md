# Zyglio - AI-Powered Training & Certification Platform

**Zyglio** is a comprehensive educational technology platform that transforms subject matter expertise into interactive training modules and voice-based certifications. The platform combines AI-powered content generation, voice interactions, and adaptive assessment to create engaging learning experiences.

## 🚀 Key Features

### 🎙️ Voice-Powered Procedure Creation
- **Voice Recording & Transcription**: Record procedures using voice commands with automatic AI transcription
- **AI Enhancement**: Get AI-suggested clarifications, questions, and content improvements
- **Media Integration**: Upload and organize supporting materials (images, videos, PDFs)
- **Step-by-Step Organization**: Structure procedures into clear, sequential steps with voice guidance

### 📚 AI-Generated Training Modules
- **Automatic Content Generation**: Transform procedures into comprehensive training modules using AI
- **Adaptive Learning Paths**: Subtopic-based learning with articles, quizzes, and interactive content
- **Rich Content Types**: Articles, embedded quizzes, drag-and-drop exercises, scenario simulations
- **SME Review Workflow**: Subject matter experts can review, edit, and approve AI-generated content

### 🎯 Voice Certification System
- **Adaptive Voice Interviews**: 15-minute AI-driven voice assessments that adapt based on quiz performance
- **Multi-Scenario Assessments**: Complex scenarios with competency-based scoring
- **Real-time Transcription**: Advanced speech-to-text with AI-powered response analysis
- **Certification Management**: Automated certificate generation and progress tracking

### 🏗️ Smart Object & Scenario Builder
- **Interactive Object System**: Define smart objects (ingredients, tools, equipment, people, locations)
- **Scenario Flow Builder**: Create complex training scenarios with trigger-based logic
- **Simulation Engine**: Voice-guided simulations with object state tracking
- **Preview & Testing**: Real-time scenario preview and validation

### 📊 Analytics & Progress Tracking
- **Comprehensive Analytics**: Track learning progress, quiz scores, and certification status
- **SME Dashboard**: Monitor trainee performance and content effectiveness
- **Competency Assessments**: Detailed scoring across multiple competency areas
- **Time Tracking**: Monitor engagement and completion times

### 🤖 RAG (Retrieval-Augmented Generation) System
- **Context-Aware Content**: Enhanced procedure creation with relevant contextual information
- **Document Knowledge Base**: Vector-based similarity search for content enhancement
- **AI-Powered Interviews**: Contextually informed questions during voice sessions

## 💻 Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **UI Components**: Shadcn UI, Radix UI primitives
- **Backend**: Next.js API Routes, Node.js
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **AI Services**: 
  - DeepSeek API (content generation)
  - OpenAI (voice transcription, scoring)
  - ElevenLabs (text-to-speech)
- **Vector Database**: pgvector for RAG system
- **Media Processing**: FFmpeg, React Dropzone
- **Form Handling**: React Hook Form with Zod validation

## 🛠️ Getting Started

### Prerequisites

- Node.js v18+ 
- npm or yarn
- PostgreSQL database (local or Supabase)
- API keys for DeepSeek, OpenAI, and ElevenLabs

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/muneer-a-khan/zyglio.git
   cd zyglio
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env.local` file with the following:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/zyglio_db"
   
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   
   # AI Services
   DEEPSEEK_API_KEY=your-deepseek-api-key
   OPENAI_API_KEY=your-openai-api-key
   ELEVENLABS_API_KEY=your-elevenlabs-api-key
   
   # Authentication
   NEXTAUTH_SECRET=your-nextauth-secret
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **Database Setup:**
   ```bash
   # Run Prisma migrations
   npx prisma migrate dev
   
   # Enable vector extension for RAG
   npx prisma db execute --file=prisma/migrations/match_chunks_function.sql
   ```

5. **Start Development Server:**
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
zyglio/
├── src/
│   ├── app/                     # Next.js app router
│   │   ├── api/                 # API routes
│   │   │   ├── training/        # Training module APIs
│   │   │   ├── certification/   # Voice certification APIs
│   │   │   ├── procedures/      # Procedure management APIs
│   │   │   ├── deepseek/        # AI content generation APIs
│   │   │   └── voice/           # Voice processing APIs
│   │   ├── training/            # Training pages
│   │   ├── certification/       # Certification pages
│   │   ├── procedures/          # Procedure management pages
│   │   └── create/              # Content creation pages
│   ├── components/              # React components
│   │   ├── training/            # Training-related components
│   │   ├── certification/       # Certification components
│   │   ├── scenarios/           # Scenario builder components
│   │   ├── simulation/          # Simulation engine components
│   │   └── ui/                  # Base UI components
│   ├── lib/                     # Utility libraries
│   │   ├── services/            # Service layer
│   │   ├── agents/              # AI agent system
│   │   └── prisma.ts            # Database client
│   └── types/                   # TypeScript type definitions
├── prisma/                      # Database schema and migrations
├── scripts/                     # Utility scripts
└── public/                      # Static assets
```

## 🔄 Development Workflow

### Branching Strategy

We follow a **Git Flow** inspired branching strategy:

#### Branch Types:
- **`main`** - Production-ready code, always deployable
- **`feature/[feature-name]`** - New features or enhancements
- **`fix/[bug-description]`** - Bug fixes
- **`hotfix/[critical-fix]`** - Critical production fixes
- **`docs/[documentation-update]`** - Documentation updates

#### Branch Naming Conventions:
```bash
feature/voice-certification-improvements
feature/add-quiz-analytics
fix/authentication-redirect-issue
fix/media-upload-validation
hotfix/critical-database-connection
docs/update-api-documentation
```

### Pull Request Guidelines

#### Creating Pull Requests:

1. **Create Feature Branch:**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes & Commit:**
   ```bash
   git add .
   git commit -m "feat: add voice certification analytics dashboard"
   ```

3. **Push Branch:**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create Pull Request** with:
   - **Clear Title**: Descriptive summary of changes
   - **Detailed Description**: What, why, and how
   - **Testing Notes**: How to test the changes
   - **Screenshots**: For UI changes
   - **Breaking Changes**: Note any breaking changes

#### Commit Message Format:
```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(training): add adaptive quiz difficulty system
fix(auth): resolve session timeout redirect issue
docs(readme): update installation instructions
refactor(api): extract common validation logic
```

#### PR Review Process:

1. **Self-Review**: Review your own code before submitting
2. **Automated Checks**: Ensure all tests and linting pass
3. **Peer Review**: At least one team member must approve
4. **Testing**: Verify functionality in development environment
5. **Merge**: Use "Squash and merge" for feature branches

#### PR Requirements:

✅ **Required Checks:**
- [ ] All tests pass
- [ ] No linting errors
- [ ] No TypeScript errors
- [ ] Build succeeds
- [ ] No console errors in browser
- [ ] Responsive design verified (if UI changes)
- [ ] Database migrations run successfully (if schema changes)

✅ **Code Quality:**
- [ ] Code follows project conventions
- [ ] Functions are properly typed
- [ ] Error handling implemented
- [ ] Performance considerations addressed
- [ ] Security best practices followed

✅ **Documentation:**
- [ ] README updated (if needed)
- [ ] API documentation updated (if new endpoints)
- [ ] Comments added for complex logic
- [ ] TypeScript interfaces defined

### Development Best Practices

#### Code Style:
- Use TypeScript strict mode
- Follow component naming conventions (kebab-case for files)
- Prefer React Server Components over Client Components
- Implement proper error boundaries and loading states
- Use semantic HTML elements

#### Performance:
- Optimize database queries with proper indexing
- Implement caching for expensive operations
- Use Next.js Image optimization
- Minimize client-side JavaScript

#### Security:
- Validate all user inputs
- Implement proper authentication checks
- Sanitize data before database operations
- Use environment variables for sensitive data

## 🗄️ Database Schema

The platform uses PostgreSQL with the following key entities:

- **Users & Authentication**: User management with role-based access
- **Procedures**: Core procedure definitions with steps and media
- **Training Modules**: AI-generated training content linked to procedures  
- **Quiz Banks**: Question banks with adaptive difficulty
- **Certifications**: Voice interview records and scoring
- **Smart Objects**: Interactive objects for scenario building
- **Simulation Sessions**: Tracking and analytics for simulations

For detailed schema information, see `prisma/schema.prisma`.

## 🔧 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking
```

## 📖 User Roles & Permissions

### Trainee (Default)
- Access training modules
- Take quizzes and assessments
- Participate in voice certifications
- View personal progress and certificates

### SME (Subject Matter Expert)
- Create and manage procedures
- Review and approve AI-generated content
- Access trainee analytics
- Manage certification requirements

### Admin
- Full platform access
- User management
- System configuration
- Advanced analytics

## 🎯 Key Workflows

### 1. Procedure to Training Module:
1. SME creates procedure with voice recording
2. AI generates training content (articles, quizzes)
3. SME reviews and approves content
4. Training module goes live for trainees

### 2. Certification Process:
1. Trainee completes all module quizzes (80% pass rate)
2. Trainee becomes eligible for voice certification
3. AI conducts adaptive 15-minute voice interview
4. System scores responses and issues certification

### 3. Scenario Building:
1. Define smart objects with properties and behaviors
2. Create scenario flow with triggers and conditions
3. Test scenario in preview mode
4. Deploy for training or assessment

## 🚀 Production Deployment

The application is optimized for deployment on:
- **Vercel** (recommended for Next.js)
- **Docker** (using provided Dockerfile)
- **Any Node.js hosting platform**

## 🐛 Troubleshooting

Common issues and solutions:

1. **Voice Recording Issues**: Check browser microphone permissions
2. **AI API Failures**: Verify API keys and rate limits
3. **Database Connection**: Ensure PostgreSQL is running and accessible
4. **Build Errors**: Clear `.next` cache and reinstall dependencies

## 📝 Contributing

1. Fork the repository
2. Create a feature branch following naming conventions
3. Make your changes with proper testing
4. Submit a pull request following the guidelines above
5. Respond to review feedback promptly

## 📄 License

This project is proprietary software. All rights reserved.

## 🤝 Support

For technical support or questions:
- Create an issue in this repository
- Contact the development team
- Check the documentation in the `/docs` folder

---

**Last Updated**: January 2025  
**Version**: 2.0.0  
**Next.js Version**: 14.x  
**Node.js Version**: 18+



