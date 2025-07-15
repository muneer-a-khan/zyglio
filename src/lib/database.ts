/**
 * Database Service
 * Provides type-safe database operations for the unified Zyglio + Objects-Scenarios platform
 */

import { PrismaClient } from '@prisma/client';
import { 
  SmartObject as SmartObjectType, 
  ScenarioStep as ScenarioStepType, 
  Trigger as TriggerType,
  EnhancedLearningTask as LearningTaskType
} from '@/types/unified';

// Prisma client with optimized configuration
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Type mappings between Prisma and our unified types
type PrismaUser = NonNullable<Awaited<ReturnType<typeof prisma.user.findFirst>>>;
type PrismaLearningTask = NonNullable<Awaited<ReturnType<typeof prisma.learningTask.findFirst>>>;
// TODO: Add smartObject model to Prisma schema
// type PrismaSmartObject = NonNullable<Awaited<ReturnType<typeof prisma.smartObject.findFirst>>>;

export class DatabaseService {
  
  // ============================================================================
  // USER OPERATIONS
  // ============================================================================
  
  /**
   * Get or create user by email
   */
  async getOrCreateUser(email: string, name?: string) {
    try {
      const user = await prisma.user.upsert({
        where: { email },
        update: { name },
        create: {
          email,
          name,
          role: 'trainee'
        }
      });
      return user;
    } catch (error) {
      console.error('Error getting/creating user:', error);
      throw new Error('Failed to get or create user');
    }
  }

  /**
   * Get user by ID with related data
   */
  async getUserById(userId: string, includeRelations = false) {
    try {
      return await prisma.user.findUnique({
        where: { id: userId },
        // TODO: Add these relationships to User model in Prisma schema
        // include: includeRelations ? {
        //   tasks: true,
        //   smartObjects: true,
        //   progress: true
        // } : undefined
      });
    } catch (error) {
      console.error('Error getting user:', error);
      throw new Error('Failed to get user');
    }
  }

  // ============================================================================
  // LEARNING TASK OPERATIONS
  // ============================================================================

  /**
   * Create a new learning task
   * TODO: Add learningTask model to Prisma schema
   */
  async createLearningTask(data: {
    title: string;
    description?: string;
    objectives?: string[];
    difficulty?: string;
    estimatedTime?: number;
    userId: string;
  }) {
    try {
      // TODO: Add learningTask model to Prisma schema
      // return await prisma.learningTask.create({
      //   data: {
      //     ...data,
      //     status: 'DRAFT'
      //   }
      // });
      console.log('createLearningTask called with:', data);
      return null;
    } catch (error) {
      console.error('Error creating learning task:', error);
      throw new Error('Failed to create learning task');
    }
  }

  /**
   * Get learning tasks for a user
   * TODO: Add learningTask model to Prisma schema
   */
  async getLearningTasksForUser(userId: string, includeObjects = false) {
    try {
      // TODO: Add learningTask model to Prisma schema
      // return await prisma.learningTask.findMany({
      //   where: { userId },
      //   include: {
      //     smartObjects: includeObjects,
      //     procedures: {
      //       include: {
      //         scenarios: {
      //           include: {
      //             steps: true,
      //             triggers: true
      //           }
      //         }
      //       }
      //     }
      //   },
      //   orderBy: { updatedAt: 'desc' }
      // });
      console.log('getLearningTasksForUser called with:', { userId, includeObjects });
      return [];
    } catch (error) {
      console.error('Error getting learning tasks:', error);
      throw new Error('Failed to get learning tasks');
    }
  }

  /**
   * Update learning task
   * TODO: Add learningTask model to Prisma schema
   */
  async updateLearningTask(taskId: string, data: Partial<LearningTaskType>) {
    try {
      // TODO: Add learningTask model to Prisma schema
      // return await prisma.learningTask.update({
      //   where: { id: taskId },
      //   data: {
      //     title: data.title,
      //     description: data.description,
      //     objectives: data.objectives,
      //     difficulty: data.difficulty,
      //     estimatedTime: data.estimatedTime,
      //     tags: data.tags,
      //     category: data.category,
      //     industry: data.industry,
      //     updatedAt: new Date()
      //   }
      // });
      console.log('updateLearningTask called with:', { taskId, data });
      return null;
    } catch (error) {
      console.error('Error updating learning task:', error);
      throw new Error('Failed to update learning task');
    }
  }

  // ============================================================================
  // SMART OBJECT OPERATIONS
  // ============================================================================

  /**
   * Create a new smart object
   * TODO: Add smartObject model to Prisma schema
   */
  async createSmartObject(data: {
    name: string;
    category: 'INGREDIENT' | 'TOOL' | 'EQUIPMENT' | 'PERSON' | 'LOCATION';
    description?: string;
    states: string[];
    behaviors: string[];
    signals: string[];
    attributes: Record<string, any>;
    currentState?: string;
    taskId?: string;
    userId: string;
  }) {
    try {
      // TODO: Add smartObject model to Prisma schema
      // return await prisma.smartObject.create({
      //   data: {
      //     ...data,
      //     tags: [],
      //     isTemplate: false
      //   }
      // });
      console.log('createSmartObject called with:', data);
      return null;
    } catch (error) {
      console.error('Error creating smart object:', error);
      throw new Error('Failed to create smart object');
    }
  }

  /**
   * Get smart objects for a task or user
   * TODO: Add smartObject model to Prisma schema
   */
  async getSmartObjects(filters: {
    userId?: string;
    taskId?: string;
    category?: string;
    isTemplate?: boolean;
  }) {
    try {
      // TODO: Add smartObject model to Prisma schema
      // return await prisma.smartObject.findMany({
      //   where: {
      //     userId: filters.userId,
      //     taskId: filters.taskId,
      //     category: filters.category as any,
      //     isTemplate: filters.isTemplate
      //   },
      //   orderBy: { updatedAt: 'desc' }
      // });
      console.log('getSmartObjects called with:', filters);
      return [];
    } catch (error) {
      console.error('Error getting smart objects:', error);
      throw new Error('Failed to get smart objects');
    }
  }

  /**
   * Update smart object
   * TODO: Add smartObject model to Prisma schema
   */
  async updateSmartObject(objectId: string, data: Partial<SmartObjectType>) {
    try {
      // TODO: Add smartObject model to Prisma schema
      // return await prisma.smartObject.update({
      //   where: { id: objectId },
      //   data: {
      //     name: data.name,
      //     description: data.description,
      //     states: data.states,
      //     behaviors: data.behaviors,
      //     signals: data.signals,
      //     attributes: data.attributes,
      //     currentState: data.currentState,
      //     tags: data.tags,
      //     updatedAt: new Date()
      //   }
      // });
      console.log('updateSmartObject called with:', { objectId, data });
      return null;
    } catch (error) {
      console.error('Error updating smart object:', error);
      throw new Error('Failed to update smart object');
    }
  }

  /**
   * Delete smart object
   * TODO: Add smartObject, trigger, and objectInteraction models to Prisma schema
   */
  async deleteSmartObject(objectId: string) {
    try {
      // TODO: Add smartObject, trigger, and objectInteraction models to Prisma schema
      // // Delete related records first
      // await prisma.trigger.deleteMany({
      //   where: { objectId }
      // });

      // await prisma.objectInteraction.deleteMany({
      //   where: { objectId }
      // });

      // // Delete the object
      // return await prisma.smartObject.delete({
      //   where: { id: objectId }
      // });
      console.log('deleteSmartObject called with:', { objectId });
      return null;
    } catch (error) {
      console.error('Error deleting smart object:', error);
      throw new Error('Failed to delete smart object');
    }
  }

  // ============================================================================
  // PROCEDURE AND SCENARIO OPERATIONS
  // ============================================================================

  /**
   * Create a new procedure with scenario
   * TODO: Add procedure and scenario models to Prisma schema
   */
  async createProcedureWithScenario(data: {
    title: string;
    description?: string;
    objectives?: string[];
    taskId: string;
    userId: string;
    scenarioTitle: string;
    scenarioDescription?: string;
  }) {
    try {
      // TODO: Add procedure and scenario models to Prisma schema
      // return await prisma.$transaction(async (tx) => {
      //   const procedure = await tx.procedure.create({
      //     data: {
      //       title: data.title,
      //       // description: data.description, // TODO: Add description field to Procedure model
      //       // objectives: data.objectives || [], // TODO: Add objectives field to Procedure model
      //       // prerequisites: [], // TODO: Add prerequisites field to Procedure model
      //       taskId: data.taskId,
      //       // userId: data.userId // TODO: Add userId field to Procedure model
      //     }
      //   });

      //   const scenario = await tx.scenario.create({
      //     data: {
      //       title: data.scenarioTitle,
      //       description: data.scenarioDescription,
      //       objectives: data.objectives || [],
      //       tags: [],
      //       procedureId: procedure.id,
      //       userId: data.userId
      //     }
      //   });

      //   return { procedure, scenario };
      // });
      console.log('createProcedureWithScenario called with:', data);
      return null;
    } catch (error) {
      console.error('Error creating procedure with scenario:', error);
      throw new Error('Failed to create procedure with scenario');
    }
  }

  /**
   * Get scenario with all related data
   * TODO: Add scenario model to Prisma schema
   */
  async getScenarioWithDetails(scenarioId: string) {
    try {
      // TODO: Add scenario model to Prisma schema
      // return await prisma.scenario.findUnique({
      //   where: { id: scenarioId },
      //   include: {
      //     steps: {
      //       include: {
      //         stepObjects: {
      //           include: {
      //             object: true
      //           }
      //         }
      //       },
      //       orderBy: { stepIndex: 'asc' }
      //     },
      //     triggers: {
      //       include: {
      //         object: true
      //       }
      //     },
      //     procedure: true
      //   }
      // });
      console.log('getScenarioWithDetails called with:', { scenarioId });
      return null;
    } catch (error) {
      console.error('Error getting scenario details:', error);
      throw new Error('Failed to get scenario details');
    }
  }

  // ============================================================================
  // SCENARIO STEP OPERATIONS
  // ============================================================================

  /**
   * Create a new scenario step
   * TODO: Add scenarioStep and scenarioStepObject models to Prisma schema
   */
  async createScenarioStep(data: {
    instruction: string;
    stepIndex: number;
    isCheckpoint?: boolean;
    requiredObjects?: string[];
    requiredActions?: string[];
    conditions?: string[];
    expectedResponses?: string[];
    feedback?: string;
    hints?: string[];
    scenarioId: string;
    voiceRecordingUrl?: string;
    transcript?: string;
  }) {
    try {
      // TODO: Add scenarioStep and scenarioStepObject models to Prisma schema
      // return await prisma.$transaction(async (tx) => {
      //   const step = await tx.scenarioStep.create({
      //     data: {
      //       instruction: data.instruction,
      //       stepIndex: data.stepIndex,
      //       isCheckpoint: data.isCheckpoint || false,
      //       requiredObjects: data.requiredObjects || [],
      //       requiredActions: data.requiredActions || [],
      //       conditions: data.conditions || [],
      //       expectedResponses: data.expectedResponses || [],
      //       feedback: data.feedback,
      //       hints: data.hints || [],
      //       scenarioId: data.scenarioId,
      //       voiceRecordingUrl: data.voiceRecordingUrl,
      //       transcript: data.transcript
      //     }
      //   });

      //   // Create relationships with objects
      //   if (data.requiredObjects && data.requiredObjects.length > 0) {
      //     await tx.scenarioStepObject.createMany({
      //       data: data.requiredObjects.map(objectId => ({
      //         stepId: step.id,
      //         objectId,
      //         isRequired: true
      //       }))
      //     });
      //   }

      //   return step;
      // });
      console.log('createScenarioStep called with:', data);
      return null;
    } catch (error) {
      console.error('Error creating scenario step:', error);
      throw new Error('Failed to create scenario step');
    }
  }

  /**
   * Update scenario step
   * TODO: Add scenarioStep and scenarioStepObject models to Prisma schema
   */
  async updateScenarioStep(stepId: string, data: Partial<ScenarioStepType>) {
    try {
      // TODO: Add scenarioStep and scenarioStepObject models to Prisma schema
      // return await prisma.$transaction(async (tx) => {
      //   const step = await tx.scenarioStep.update({
      //     where: { id: stepId },
      //     data: {
      //       instruction: data.instruction,
      //       isCheckpoint: data.isCheckpoint,
      //       requiredActions: data.requiredActions,
      //       conditions: data.conditions,
      //       expectedResponses: data.expectedResponses,
      //       feedback: data.feedback,
      //       hints: data.hints,
      //       voiceRecordingUrl: data.voiceRecordingUrl,
      //       transcript: data.transcript,
      //       updatedAt: new Date()
      //     }
      //   });

      //   // Update object relationships if provided
      //   if (data.requiredObjects) {
      //     // Remove existing relationships
      //     await tx.scenarioStepObject.deleteMany({
      //       where: { stepId }
      //     });

      //     // Create new relationships
      //     if (data.requiredObjects.length > 0) {
      //       await tx.scenarioStepObject.createMany({
      //         data: data.requiredObjects.map(objectId => ({
      //           stepId,
      //           objectId,
      //           isRequired: true
      //         }))
      //       });
      //     }
      //   }

      //   return step;
      // });
      console.log('updateScenarioStep called with:', { stepId, data });
      return null;
    } catch (error) {
      console.error('Error updating scenario step:', error);
      throw new Error('Failed to update scenario step');
    }
  }

  /**
   * Delete scenario step
   * TODO: Add scenarioStep and scenarioStepObject models to Prisma schema
   */
  async deleteScenarioStep(stepId: string) {
    try {
      // TODO: Implement when scenarioStep and scenarioStepObject models are added to schema
      console.log('deleteScenarioStep called with:', { stepId });
      return { id: stepId };
      
      // return await prisma.$transaction(async (tx) => {
      //   // Delete object relationships
      //   await tx.scenarioStepObject.deleteMany({
      //     where: { stepId }
      //   });

      //   // Delete the step
      //   return await tx.scenarioStep.delete({
      //     where: { id: stepId }
      //   });
      // });
    } catch (error) {
      console.error('Error deleting scenario step:', error);
      throw new Error('Failed to delete scenario step');
    }
  }

  // ============================================================================
  // TRIGGER OPERATIONS
  // ============================================================================

  /**
   * Create a new trigger
   * TODO: Add trigger model to Prisma schema
   */
  async createTrigger(data: {
    signal: string;
    condition: string;
    action: string;
    objectId: string;
    scenarioId: string;
    isActive?: boolean;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    description?: string;
    category?: 'INTERACTION' | 'STATE_CHANGE' | 'TIME_BASED' | 'CONDITION' | 'SYSTEM';
  }) {
    try {
      // TODO: Implement when trigger model is added to schema
      console.log('createTrigger called with:', data);
      return {
        id: 'temp-trigger-id',
        ...data,
        isActive: data.isActive ?? true,
        priority: data.priority ?? 'medium',
        category: data.category ?? 'INTERACTION'
      };
      
      // return await prisma.trigger.create({
      //   data: {
      //     ...data,
      //     isActive: data.isActive ?? true,
      //     priority: data.priority ?? 1,
      //     category: data.category ?? 'INTERACTION'
      //   }
      // });
    } catch (error) {
      console.error('Error creating trigger:', error);
      throw new Error('Failed to create trigger');
    }
  }

  /**
   * Get triggers for a scenario
   * TODO: Add trigger model to Prisma schema
   */
  async getTriggersForScenario(scenarioId: string) {
    try {
      // TODO: Implement when trigger model is added to schema
      console.log('getTriggersForScenario called with:', { scenarioId });
      return [];
      
      // return await prisma.trigger.findMany({
      //   where: { scenarioId },
      //   include: {
      //     object: true
      //   },
      //   orderBy: { priority: 'desc' }
      // });
    } catch (error) {
      console.error('Error getting triggers:', error);
      throw new Error('Failed to get triggers');
    }
  }

  /**
   * Update trigger
   * TODO: Add trigger model to Prisma schema
   */
  async updateTrigger(triggerId: string, data: Partial<TriggerType>) {
    try {
      // TODO: Implement when trigger model is added to schema
      console.log('updateTrigger called with:', { triggerId, data });
      return {
        id: triggerId,
        signal: data.signal,
        condition: data.condition,
        action: data.action,
        isActive: data.isActive,
        priority: data.priority,
        description: data.description,
        updatedAt: new Date()
      };
      
      // return await prisma.trigger.update({
      //   where: { id: triggerId },
      //   data: {
      //     signal: data.signal,
      //     condition: data.condition,
      //     action: data.action,
      //     isActive: data.isActive,
      //     priority: data.priority,
      //     description: data.description,
      //     updatedAt: new Date()
      //   }
      // });
    } catch (error) {
      console.error('Error updating trigger:', error);
      throw new Error('Failed to update trigger');
    }
  }

  /**
   * Delete trigger
   * TODO: Add trigger model to Prisma schema
   */
  async deleteTrigger(triggerId: string) {
    try {
      // TODO: Implement when trigger model is added to schema
      console.log('deleteTrigger called with:', { triggerId });
      return { id: triggerId };
      
      // return await prisma.trigger.delete({
      //   where: { id: triggerId }
      // });
    } catch (error) {
      console.error('Error deleting trigger:', error);
      throw new Error('Failed to delete trigger');
    }
  }

  // ============================================================================
  // SIMULATION SESSION OPERATIONS
  // ============================================================================

  /**
   * Create a new simulation session
   * TODO: Add simulationSession model to Prisma schema
   */
  async createSimulationSession(data: {
    scenarioId: string;
    userId: string;
    totalSteps: number;
    objectStates: Record<string, any>;
  }) {
    try {
      // TODO: Implement when simulationSession model is added to schema
      console.log('createSimulationSession called with:', data);
      return {
        id: 'temp-session-id',
        scenarioId: data.scenarioId,
        userId: data.userId,
        totalSteps: data.totalSteps,
        objectStates: data.objectStates,
        stepProgress: {},
        errorLog: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // return await prisma.simulationSession.create({
      //   data: {
      //     scenarioId: data.scenarioId,
      //     userId: data.userId,
      //     totalSteps: data.totalSteps,
      //     objectStates: data.objectStates,
      //     stepProgress: {},
      //     errorLog: []
      //   }
      // });
    } catch (error) {
      console.error('Error creating simulation session:', error);
      throw new Error('Failed to create simulation session');
    }
  }

  /**
   * Update simulation session progress
   * TODO: Add simulationSession model to Prisma schema
   */
  async updateSimulationSession(sessionId: string, data: {
    score?: number;
    completedSteps?: number;
    timeSpent?: number;
    currentStepId?: string;
    objectStates?: Record<string, any>;
    stepProgress?: Record<string, any>;
    status?: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'FAILED' | 'ABANDONED';
    endTime?: Date;
  }) {
    try {
      // TODO: Implement when simulationSession model is added to schema
      console.log('updateSimulationSession called with:', { sessionId, data });
      return {
        id: sessionId,
        ...data,
        updatedAt: new Date()
      };
      
      // return await prisma.simulationSession.update({
      //   where: { id: sessionId },
      //   data: {
      //     ...data,
      //     updatedAt: new Date()
      //   }
      // });
    } catch (error) {
      console.error('Error updating simulation session:', error);
      throw new Error('Failed to update simulation session');
    }
  }

  /**
   * Record object interaction
   * TODO: Add objectInteraction model to Prisma schema
   */
  async recordObjectInteraction(data: {
    objectId: string;
    sessionId: string;
    userId: string;
    action: string;
    result: 'SUCCESS' | 'FAILURE' | 'PARTIAL' | 'RETRY';
    feedback?: string;
    stepContext?: string;
    triggersFired?: string[];
    stateChanges?: Record<string, any>;
    responseTime?: number;
    attempts?: number;
    isCorrect?: boolean;
  }) {
    try {
      // TODO: Implement when objectInteraction model is added to schema
      console.log('recordObjectInteraction called with:', data);
      return {
        id: 'temp-interaction-id',
        ...data,
        attempts: data.attempts ?? 1,
        isCorrect: data.isCorrect ?? true,
        triggersFired: data.triggersFired || [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // return await prisma.objectInteraction.create({
      //   data: {
      //     ...data,
      //     attempts: data.attempts ?? 1,
      //     isCorrect: data.isCorrect ?? true,
      //     triggersFired: data.triggersFired || []
      //   }
      // });
    } catch (error) {
      console.error('Error recording object interaction:', error);
      throw new Error('Failed to record object interaction');
    }
  }

  // ============================================================================
  // ANALYTICS AND REPORTING
  // ============================================================================

  /**
   * Get user learning progress
   */
  async getUserLearningProgress(userId: string) {
    try {
      return await prisma.trainingProgress.findMany({
        where: { userId },
        include: {
          module: true
        },
        orderBy: { lastAccessedAt: 'desc' }
      });
    } catch (error) {
      console.error('Error getting user learning progress:', error);
      throw new Error('Failed to get user learning progress');
    }
  }

  /**
   * Record analytics event
   */
  async recordAnalyticsEvent(data: {
    eventType: string;
    eventData: Record<string, any>;
    sessionId?: string;
    userId?: string;
    objectId?: string;
    scenarioId?: string;
    userAgent?: string;
    ipAddress?: string;
  }) {
    try {
      // TODO: Implement when analyticsEvent model is added to schema
      console.log('recordAnalyticsEvent called with:', data);
      return {
        id: 'temp-analytics-id',
        ...data,
        createdAt: new Date()
      };
      
      // return await prisma.analyticsEvent.create({
      //   data
      // });
    } catch (error) {
      console.error('Error recording analytics event:', error);
      // Don't throw error for analytics - just log it
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Health check for database connection
   */
  async healthCheck() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date() };
    } catch (error) {
      console.error('Database health check failed:', error);
      return { status: 'unhealthy', error: error instanceof Error ? error.message : String(error), timestamp: new Date() };
    }
  }

  // ============================================================================
  // MEDIA FILE OPERATIONS
  // ============================================================================

  // Media file operations removed - using Supabase storage directly

  /**
   * Close database connection
   */
  async disconnect() {
    await prisma.$disconnect();
  }
}

// Export singleton instance
export const databaseService = new DatabaseService(); 