-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'PDF');

-- CreateEnum
CREATE TYPE "SuggestionType" AS ENUM ('INSERTION', 'CLARIFYING_QUESTION', 'MCQ', 'OPEN_ENDED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'OPEN_ENDED');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('sme', 'trainee', 'admin');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "user_role" NOT NULL DEFAULT 'trainee',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningTask" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" TEXT NOT NULL,
    "kpiTech" TEXT,
    "kpiConcept" TEXT,
    "presenter" TEXT NOT NULL,
    "affiliation" TEXT,
    "date" TIMESTAMPTZ(6) NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "LearningTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaItem" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "type" "MediaType" NOT NULL,
    "caption" TEXT,
    "url" TEXT NOT NULL,
    "relevance" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskId" UUID NOT NULL,
    "stepId" UUID,

    CONSTRAINT "MediaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalResource" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "url" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "taskId" UUID NOT NULL,

    CONSTRAINT "ExternalResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dictation" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "audioUrl" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskId" UUID NOT NULL,

    CONSTRAINT "Dictation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AISuggestion" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "text" TEXT NOT NULL,
    "kind" "SuggestionType" NOT NULL,
    "dictationId" UUID NOT NULL,

    CONSTRAINT "AISuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "type" "QuestionType" NOT NULL,
    "content" TEXT NOT NULL,
    "options" TEXT,
    "correct" TEXT,
    "dictationId" UUID,
    "stepId" UUID,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Procedure" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" TEXT NOT NULL,
    "taskId" UUID NOT NULL,
    "simulationSettings" JSONB DEFAULT '{}',

    CONSTRAINT "Procedure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcedureStep" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "notes" TEXT,
    "conditions" TEXT,
    "procedureId" UUID NOT NULL,

    CONSTRAINT "ProcedureStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YamlOutput" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "content" TEXT NOT NULL,
    "taskId" UUID NOT NULL,

    CONSTRAINT "YamlOutput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flowchart" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "mermaid" TEXT NOT NULL,
    "taskId" UUID NOT NULL,

    CONSTRAINT "Flowchart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Simulation" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "taskId" UUID NOT NULL,

    CONSTRAINT "Simulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationStep" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "prompt" TEXT NOT NULL,
    "expectedAnswer" TEXT,
    "mediaUrl" TEXT,
    "latencyThreshold" INTEGER,
    "feedback" TEXT,
    "simulationId" UUID NOT NULL,

    CONSTRAINT "SimulationStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "LearningTask_userId_idx" ON "LearningTask"("userId");

-- CreateIndex
CREATE INDEX "MediaItem_stepId_idx" ON "MediaItem"("stepId");

-- CreateIndex
CREATE INDEX "MediaItem_taskId_idx" ON "MediaItem"("taskId");

-- CreateIndex
CREATE INDEX "ExternalResource_taskId_idx" ON "ExternalResource"("taskId");

-- CreateIndex
CREATE INDEX "Dictation_taskId_idx" ON "Dictation"("taskId");

-- CreateIndex
CREATE INDEX "AISuggestion_dictationId_idx" ON "AISuggestion"("dictationId");

-- CreateIndex
CREATE INDEX "Question_dictationId_idx" ON "Question"("dictationId");

-- CreateIndex
CREATE INDEX "Question_stepId_idx" ON "Question"("stepId");

-- CreateIndex
CREATE INDEX "Procedure_taskId_idx" ON "Procedure"("taskId");

-- CreateIndex
CREATE INDEX "ProcedureStep_procedureId_idx" ON "ProcedureStep"("procedureId");

-- CreateIndex
CREATE INDEX "YamlOutput_taskId_idx" ON "YamlOutput"("taskId");

-- CreateIndex
CREATE INDEX "Flowchart_taskId_idx" ON "Flowchart"("taskId");

-- CreateIndex
CREATE INDEX "Simulation_taskId_idx" ON "Simulation"("taskId");

-- CreateIndex
CREATE INDEX "SimulationStep_simulationId_idx" ON "SimulationStep"("simulationId");

-- AddForeignKey
ALTER TABLE "LearningTask" ADD CONSTRAINT "LearningTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "MediaItem" ADD CONSTRAINT "MediaItem_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ProcedureStep"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "MediaItem" ADD CONSTRAINT "MediaItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "LearningTask"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ExternalResource" ADD CONSTRAINT "ExternalResource_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "LearningTask"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Dictation" ADD CONSTRAINT "Dictation_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "LearningTask"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AISuggestion" ADD CONSTRAINT "AISuggestion_dictationId_fkey" FOREIGN KEY ("dictationId") REFERENCES "Dictation"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_dictationId_fkey" FOREIGN KEY ("dictationId") REFERENCES "Dictation"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ProcedureStep"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "LearningTask"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProcedureStep" ADD CONSTRAINT "ProcedureStep_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "YamlOutput" ADD CONSTRAINT "YamlOutput_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "LearningTask"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Flowchart" ADD CONSTRAINT "Flowchart_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "LearningTask"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Simulation" ADD CONSTRAINT "Simulation_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "LearningTask"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SimulationStep" ADD CONSTRAINT "SimulationStep_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
