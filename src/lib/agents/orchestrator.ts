import { validateTranscript } from './validation-agent';
import { getClarifications } from './clarification-agent';
import { generateFollowUpQuestions } from './follow-up-agent';
import { generateSpeech } from '../tts-service';

interface OrchestratorInput {
  transcript: string;
  procedureContext: string;
  conversationHistory: Array<{role: 'ai' | 'user', content: string}>;
  sessionId: string;
}

interface OrchestratorOutput {
  responseText: string;
  audioBase64: string;
  validationIssues: string[];
  clarificationsMade: boolean;
  followUpChosen: boolean;
}

/**
 * Orchestrates the different agents and prioritizes responses
 */
export async function orchestrateAgents({
  transcript,
  procedureContext,
  conversationHistory,
  sessionId
}: OrchestratorInput): Promise<OrchestratorOutput> {
  // Run all agents in parallel for efficiency
  const [validationResult, clarificationResult, followUpResult] = await Promise.all([
    validateTranscript(transcript, procedureContext),
    getClarifications(transcript, procedureContext, conversationHistory),
    generateFollowUpQuestions(transcript, procedureContext, conversationHistory)
  ]);

  // Decision logic for response prioritization
  let responseText = '';
  let validationIssues: string[] = [];
  let clarificationsMade = false;
  let followUpChosen = false;

  // 1. Critical validation issues take highest priority
  if (!validationResult.isValid && validationResult.confidence > 0.7) {
    responseText = `I noticed something that may not be accurate. ${validationResult.feedback} `;
    validationIssues = validationResult.issues;
    
    // If we have high-priority clarifications, add them
    if (clarificationResult.needsClarification && clarificationResult.priority === 'high') {
      responseText += `Could you please clarify: ${clarificationResult.clarificationQuestions[0]} `;
      clarificationsMade = true;
    }
  } 
  // 2. High priority clarifications come next
  else if (clarificationResult.needsClarification && clarificationResult.priority === 'high') {
    responseText = `To make sure I understand correctly, ${clarificationResult.clarificationQuestions[0]} `;
    if (clarificationResult.clarificationQuestions.length > 1) {
      responseText += `Also, ${clarificationResult.clarificationQuestions[1]} `;
    }
    clarificationsMade = true;
  } 
  // 3. Otherwise, use the highest priority follow-up question
  else {
    // Find the highest priority follow-up question
    const highPriorityQuestions = followUpResult.questions.filter(q => q.priority === 'high');
    const mediumPriorityQuestions = followUpResult.questions.filter(q => q.priority === 'medium');
    
    let selectedQuestion;
    if (highPriorityQuestions.length > 0) {
      selectedQuestion = highPriorityQuestions[0];
    } else if (mediumPriorityQuestions.length > 0) {
      selectedQuestion = mediumPriorityQuestions[0];
    } else if (followUpResult.questions.length > 0) {
      selectedQuestion = followUpResult.questions[0];
    }

    if (selectedQuestion) {
      responseText = selectedQuestion.question;
      followUpChosen = true;
    } else {
      // Fallback if no questions were generated
      responseText = "Thank you for that information. Could you tell me more about this procedure?";
    }
  }

  // Generate speech from the chosen response
  const audioBuffer = await generateSpeech(responseText);
  const audioBase64 = Buffer.from(audioBuffer).toString('base64');

  return {
    responseText,
    audioBase64,
    validationIssues,
    clarificationsMade,
    followUpChosen
  };
} 