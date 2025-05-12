# Zyglio


**URL**: https://lovable.dev/projects/9aa278e3-baff-4127-b8c2-b5009b34d2e6

- **Voice Recording & Transcription**: Record procedures using voice commands and get automatic transcription
- **Task Definition**: Define tasks with KPIs, presenter information, and objectives
- **Media Library**: Upload and organize supporting materials (images, videos, PDFs)
- **Procedural Steps**: Organize procedures into clear, sequential steps
- **AI Assistance**: Get AI-suggested clarifications and questions
- **YAML Generation**: Automatically generate structured YAML schema of procedures
- **Flowchart Visualization**: View procedures as interactive flowcharts
- **Simulation Building**: Create voice-first simulation experiences

## Technology Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **UI Components**: Shadcn UI
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL database (local or Supabase)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/voice-procedural-craftsman.git
   cd voice-procedural-craftsman
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following content:
   ```
   # Prisma
   DATABASE_URL="postgresql://username:password@localhost:5432/voice_procedural_db"
   
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. Run Prisma migrations:
   ```
   npx prisma migrate dev
   ```

5. Start the development server:
   ```
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

- `/src/app`: Next.js app router pages and API routes
- `/src/components`: Reusable React components
- `/src/lib`: Utility functions and libraries
- `/prisma`: Prisma schema and migrations
- `/public`: Static assets

## Database Structure

The database schema includes models for:

- Users
- Learning Tasks
- Media Items
- Dictations
- AI Suggestions
- Procedures and Steps
- Flowcharts
- Simulations

## Development Workflow

1. Define a Learning Task with KPIs
2. Upload supporting media
3. Record and transcribe procedure steps
4. Organize steps with AI assistance
5. Generate flowcharts and YAML
6. Create simulations



