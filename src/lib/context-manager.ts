import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Store the initial context when a task is created
 */
export async function storeInitialContext(taskId: string, context: string): Promise<void> {
  try {
    // TODO: Add interviewContext model to Prisma schema
    // await prisma.interviewContext.upsert({
    //   where: { taskId },
    //   create: {
    //     taskId,
    //     baseContext: context,
    //     enhancedContext: context,
    //     mediaProcessed: false
    //   },
    //   update: {
    //     baseContext: context,
    //     // Only update enhanced context if no media has been processed yet
    //     enhancedContext: context,
    //     mediaProcessed: false
    //   }
    // });
    console.log('storeInitialContext called with:', { taskId, context });
  } catch (error) {
    console.error('Error storing initial context:', error);
  }
}

/**
 * Get the current context for a task (enhanced if available, otherwise base)
 */
export async function getCurrentContext(taskId: string): Promise<string | null> {
  try {
    // TODO: Add interviewContext model to Prisma schema
    // const context = await prisma.interviewContext.findFirst({
    //   where: { taskId }
    // });

    // return context?.enhancedContext || context?.baseContext || null;
    console.log('getCurrentContext called with:', { taskId });
    return null;
  } catch (error) {
    console.error('Error getting current context:', error);
    return null;
  }
}

/**
 * Check if media processing is complete for a task
 */
export async function isMediaProcessingComplete(taskId: string): Promise<boolean> {
  try {
    // TODO: Add interviewContext model to Prisma schema
    // const context = await prisma.interviewContext.findFirst({
    //   where: { taskId }
    // });

    // return context?.mediaProcessed || false;
    console.log('isMediaProcessingComplete called with:', { taskId });
    return false;
  } catch (error) {
    console.error('Error checking media processing status:', error);
    return false;
  }
} 