import yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';
import {
  SimulationObject,
  SimulationScenario,
  SimulationTrigger,
  TriggerEvent,
  TriggerAction,
  ScenarioCondition,
  ScenarioOutcome
} from '@/types/simulation';

interface YamlStep {
  id: string;
  title: string;
  description: string;
  next?: string;
  decision_point?: boolean;
  options?: Array<{
    choice: string;
    next: string;
    condition: string;
  }>;
  is_terminal?: boolean;
}

interface YamlProcedure {
  procedure_name: string;
  purpose: string;
  steps: YamlStep[];
  considerations?: {
    'pre-operative'?: string[];
    'intra-operative'?: string[];
    'post-operative'?: string[];
  };
  goals?: string[];
}

export interface GeneratedSimulationElements {
  objects: SimulationObject[];
  scenarios: SimulationScenario[];
  triggers: SimulationTrigger[];
}

/**
 * Parse YAML content and automatically generate simulation elements
 */
export function generateSimulationFromYaml(yamlContent: string): GeneratedSimulationElements {
  try {
    const parsedYaml = yaml.load(yamlContent) as YamlProcedure;
    
    if (!parsedYaml || !parsedYaml.steps) {
      return { objects: [], scenarios: [], triggers: [] };
    }

    const objects = generateObjectsFromYaml(parsedYaml);
    const scenarios = generateScenariosFromYaml(parsedYaml);
    const triggers = generateTriggersFromYaml(parsedYaml);

    return { objects, scenarios, triggers };
  } catch (error) {
    console.error('Error parsing YAML for simulation generation:', error);
    return { objects: [], scenarios: [], triggers: [] };
  }
}

/**
 * Generate simulation objects from YAML steps
 */
function generateObjectsFromYaml(yamlData: YamlProcedure): SimulationObject[] {
  const objects: SimulationObject[] = [];
  const now = new Date();

  // Extract equipment, materials, and environment objects from step descriptions
  const equipmentKeywords = [
    'equipment', 'instrument', 'monitor', 'device', 'machine', 'tool',
    'stethoscope', 'thermometer', 'sphygmomanometer', 'probe', 'catheter',
    'syringe', 'needle', 'scalpel', 'forceps', 'clamp', 'tube'
  ];

  const materialKeywords = [
    'material', 'supply', 'gauze', 'bandage', 'tape', 'antiseptic',
    'medication', 'drug', 'solution', 'fluid', 'oxygen', 'suture'
  ];

  const environmentKeywords = [
    'room', 'environment', 'field', 'area', 'space', 'table', 'bed',
    'operating room', 'sterile field', 'workspace', 'station'
  ];

  // Patient object (always present in medical procedures)
  objects.push({
    id: uuidv4(),
    name: 'Patient',
    type: 'person',
    description: 'The patient undergoing the procedure',
    properties: {
      vitals: {
        bloodPressure: '120/80',
        heartRate: 72,
        temperature: 98.6,
        respiratoryRate: 16
      },
      position: 'supine',
      consciousness: 'alert',
      status: 'stable'
    },
    interactions: ['assess', 'position', 'monitor', 'examine'],
    tags: ['patient', 'primary'],
    createdAt: now,
    updatedAt: now
  });

  // Healthcare provider object
  objects.push({
    id: uuidv4(),
    name: 'Healthcare Provider',
    type: 'person',
    description: 'The healthcare professional performing the procedure',
    properties: {
      role: 'physician',
      experience: 'experienced',
      sterile: true
    },
    interactions: ['perform', 'assess', 'document', 'communicate'],
    tags: ['provider', 'staff'],
    createdAt: now,
    updatedAt: now
  });

  // Parse steps to extract equipment and materials
  yamlData.steps.forEach((step, index) => {
    const stepText = `${step.title} ${step.description}`.toLowerCase();
    
    // Check for equipment
    equipmentKeywords.forEach(keyword => {
      if (stepText.includes(keyword) && !objects.some(obj => obj.name.toLowerCase().includes(keyword))) {
        objects.push({
          id: uuidv4(),
          name: keyword.charAt(0).toUpperCase() + keyword.slice(1),
          type: 'equipment',
          description: `${keyword} used in ${step.title}`,
          properties: {
            isReady: false,
            isCalibrated: true,
            batteryLevel: 100,
            lastMaintenance: new Date().toISOString()
          },
          interactions: ['setup', 'calibrate', 'use', 'clean'],
          tags: ['equipment', keyword],
          createdAt: now,
          updatedAt: now
        });
      }
    });

    // Check for materials
    materialKeywords.forEach(keyword => {
      if (stepText.includes(keyword) && !objects.some(obj => obj.name.toLowerCase().includes(keyword))) {
        objects.push({
          id: uuidv4(),
          name: keyword.charAt(0).toUpperCase() + keyword.slice(1),
          type: 'material',
          description: `${keyword} required for ${step.title}`,
          properties: {
            quantity: 1,
            sterile: true,
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          },
          interactions: ['prepare', 'use', 'dispose'],
          tags: ['material', keyword],
          createdAt: now,
          updatedAt: now
        });
      }
    });

    // Check for environment elements
    environmentKeywords.forEach(keyword => {
      if (stepText.includes(keyword) && !objects.some(obj => obj.name.toLowerCase().includes(keyword))) {
        objects.push({
          id: uuidv4(),
          name: keyword.charAt(0).toUpperCase() + keyword.slice(1),
          type: 'environment',
          description: `${keyword} environment for the procedure`,
          properties: {
            temperature: 22,
            humidity: 45,
            lighting: 'optimal',
            sterile: stepText.includes('sterile')
          },
          interactions: ['prepare', 'maintain', 'monitor'],
          tags: ['environment', keyword],
          createdAt: now,
          updatedAt: now
        });
      }
    });
  });

  // Add procedure documentation object
  objects.push({
    id: uuidv4(),
    name: 'Procedure Documentation',
    type: 'document',
    description: 'Documentation and records for the procedure',
    properties: {
      completed: false,
      signed: false,
      sections: ['patient_info', 'procedure_notes', 'outcomes']
    },
    interactions: ['complete', 'sign', 'review', 'archive'],
    tags: ['documentation', 'record'],
    createdAt: now,
    updatedAt: now
  });

  return objects;
}

/**
 * Generate simulation scenarios from YAML data
 */
function generateScenariosFromYaml(yamlData: YamlProcedure): SimulationScenario[] {
  const scenarios: SimulationScenario[] = [];
  const now = new Date();

  // Main scenario based on the complete procedure
  const mainScenario: SimulationScenario = {
    id: uuidv4(),
    name: yamlData.procedure_name,
    description: yamlData.purpose,
    objectives: yamlData.goals || [
      'Complete the procedure successfully',
      'Maintain patient safety throughout',
      'Follow proper protocols and guidelines'
    ],
    difficulty: 'intermediate',
    estimatedDuration: Math.max(30, yamlData.steps.length * 3), // 3 minutes per step minimum
    objects: [], // Will be populated with object IDs
    triggers: [], // Will be populated with trigger IDs
    conditions: generateConditionsFromSteps(yamlData.steps),
    outcomes: generateOutcomesFromSteps(yamlData.steps),
    tags: ['main', 'complete', 'procedure'],
    createdAt: now,
    updatedAt: now
  };

  scenarios.push(mainScenario);

  // Generate sub-scenarios for complex decision points
  const decisionSteps = yamlData.steps.filter(step => step.decision_point);
  
  decisionSteps.forEach((step, index) => {
    if (step.options && step.options.length > 2) {
      scenarios.push({
        id: uuidv4(),
        name: `${step.title} - Decision Training`,
        description: `Focused training on decision-making for: ${step.description}`,
        objectives: [
          `Master the decision criteria for ${step.title}`,
          'Understand the implications of each choice',
          'Practice rapid decision-making'
        ],
        difficulty: 'advanced',
        estimatedDuration: 15,
        objects: [],
        triggers: [],
        conditions: [{
          id: uuidv4(),
          type: 'action',
          description: `Complete ${step.title} decision point`,
          criteria: { stepId: step.id },
          operator: 'exists',
          value: true
        }],
        outcomes: step.options.map(option => ({
          id: uuidv4(),
          type: 'information',
          title: option.choice,
          description: option.condition,
          feedback: `Selected: ${option.choice}. This leads to the next step in the procedure.`
        })),
        tags: ['decision', 'training', step.id],
        createdAt: now,
        updatedAt: now
      });
    }
  });

  // Generate emergency scenario if emergency steps exist
  const emergencySteps = yamlData.steps.filter(step => 
    step.title.toLowerCase().includes('emergency') || 
    step.description.toLowerCase().includes('emergency') ||
    step.title.toLowerCase().includes('complication')
  );

  if (emergencySteps.length > 0) {
    scenarios.push({
      id: uuidv4(),
      name: 'Emergency Response Training',
      description: 'Training focused on handling emergency situations and complications',
      objectives: [
        'Recognize emergency situations quickly',
        'Implement emergency protocols correctly',
        'Maintain calm under pressure'
      ],
      difficulty: 'advanced',
      estimatedDuration: 20,
      objects: [],
      triggers: [],
      conditions: [{
        id: uuidv4(),
        type: 'response',
        description: 'Emergency situation triggered',
        criteria: { emergency: true },
        operator: 'equals',
        value: true
      }],
      outcomes: [{
        id: uuidv4(),
        type: 'success',
        title: 'Emergency Handled Successfully',
        description: 'Emergency situation was resolved appropriately',
        score: 100,
        feedback: 'Excellent emergency response! You followed protocols correctly.'
      }, {
        id: uuidv4(),
        type: 'failure',
        title: 'Emergency Response Needs Improvement',
        description: 'Emergency handling could be improved',
        score: 50,
        feedback: 'Review emergency protocols and practice response times.'
      }],
      tags: ['emergency', 'advanced', 'critical'],
      createdAt: now,
      updatedAt: now
    });
  }

  return scenarios;
}

/**
 * Generate simulation triggers from YAML data
 */
function generateTriggersFromYaml(yamlData: YamlProcedure): SimulationTrigger[] {
  const triggers: SimulationTrigger[] = [];
  const now = new Date();

  // Step advancement triggers
  yamlData.steps.forEach((step, index) => {
    // Step start trigger
    triggers.push({
      id: uuidv4(),
      name: `${step.title} - Start`,
      description: `Trigger when ${step.title} begins`,
      type: 'event',
      event: {
        type: 'step_start',
        target: step.id,
        parameters: { stepIndex: index }
      },
      conditions: [],
      actions: [{
        id: uuidv4(),
        type: 'show_message',
        description: `Display step instructions`,
        parameters: {
          title: step.title,
          message: step.description,
          type: 'info'
        }
      }],
      priority: 'medium',
      isActive: true,
      tags: ['step', 'guidance', step.id],
      createdAt: now,
      updatedAt: now
    });

    // Decision point triggers
    if (step.decision_point && step.options) {
      step.options.forEach((option, optionIndex) => {
        triggers.push({
          id: uuidv4(),
          name: `${step.title} - ${option.choice}`,
          description: `Trigger when user selects: ${option.choice}`,
          type: 'user_action',
          event: {
            type: 'text_input',
            target: step.id,
            parameters: { 
              choice: option.choice,
              nextStep: option.next 
            }
          },
          conditions: [{
            id: uuidv4(),
            type: 'user_progress',
            description: `User reaches decision point ${step.id}`,
            logic: 'AND',
            criteria: { 
              currentStep: step.id,
              choiceSelected: option.choice 
            }
          }],
          actions: [
            {
              id: uuidv4(),
              type: 'show_message',
              description: 'Show decision feedback',
              parameters: {
                title: `Choice: ${option.choice}`,
                message: `Condition: ${option.condition}`,
                type: 'success'
              }
            },
            {
              id: uuidv4(),
              type: 'branch_step',
              description: 'Branch to next step',
              parameters: { stepId: option.next }
            }
          ],
          priority: 'high',
          isActive: true,
          tags: ['decision', 'branching', step.id],
          createdAt: now,
          updatedAt: now
        });
      });
    }
  });

  // Time-based triggers for procedure monitoring
  triggers.push({
    id: uuidv4(),
    name: 'Procedure Time Warning',
    description: 'Warning when procedure is taking longer than expected',
    type: 'timer',
    event: {
      type: 'timer_elapsed',
      parameters: { interval: yamlData.steps.length * 180 } // 3 minutes per step
    },
    conditions: [{
      id: uuidv4(),
      type: 'time_elapsed',
      description: 'Procedure duration exceeds expected time',
      logic: 'AND',
      criteria: { threshold: yamlData.steps.length * 180 }
    }],
    actions: [{
      id: uuidv4(),
      type: 'show_message',
      description: 'Show time warning',
      parameters: {
        title: 'Time Management',
        message: 'The procedure is taking longer than expected. Consider reviewing your pace.',
        type: 'warning'
      }
    }],
    priority: 'medium',
    isActive: true,
    cooldown: 300, // 5 minute cooldown
    tags: ['timing', 'warning'],
    createdAt: now,
    updatedAt: now
  });

  // Completion trigger
  const finalStep = yamlData.steps.find(step => step.is_terminal);
  if (finalStep) {
    triggers.push({
      id: uuidv4(),
      name: 'Procedure Completion',
      description: 'Trigger when the procedure is completed',
      type: 'event',
      event: {
        type: 'step_complete',
        target: finalStep.id,
        parameters: { procedureComplete: true }
      },
      conditions: [],
      actions: [
        {
          id: uuidv4(),
          type: 'show_message',
          description: 'Show completion message',
          parameters: {
            title: 'Procedure Complete!',
            message: `Congratulations! You have successfully completed ${yamlData.procedure_name}.`,
            type: 'success'
          }
        },
        {
          id: uuidv4(),
          type: 'end_simulation',
          description: 'End the simulation',
          parameters: { reason: 'successful_completion' }
        }
      ],
      priority: 'high',
      isActive: true,
      maxActivations: 1,
      tags: ['completion', 'success'],
      createdAt: now,
      updatedAt: now
    });
  }

  // Error handling triggers
  triggers.push({
    id: uuidv4(),
    name: 'Critical Error Handler',
    description: 'Handle critical errors during the procedure',
    type: 'system_state',
    event: {
      type: 'step_complete',
      parameters: { errorType: 'critical' }
    },
    conditions: [{
      id: uuidv4(),
      type: 'custom',
      description: 'Critical error detected',
      logic: 'OR',
      criteria: { errorLevel: 'critical' }
    }],
    actions: [
      {
        id: uuidv4(),
        type: 'show_message',
        description: 'Show error message',
        parameters: {
          title: 'Critical Error',
          message: 'A critical error has occurred. Please review your actions and try again.',
          type: 'error'
        }
      },
      {
        id: uuidv4(),
        type: 'play_audio',
        description: 'Play error sound',
        parameters: { audioUrl: '/sounds/error.mp3' }
      }
    ],
    priority: 'critical',
    isActive: true,
    tags: ['error', 'critical'],
    createdAt: now,
    updatedAt: now
  });

  return triggers;
}

/**
 * Generate scenario conditions from YAML steps
 */
function generateConditionsFromSteps(steps: YamlStep[]): ScenarioCondition[] {
  const conditions: ScenarioCondition[] = [];

  // Add completion condition
  conditions.push({
    id: uuidv4(),
    type: 'action',
    description: 'All procedure steps completed',
    criteria: { totalSteps: steps.length },
    operator: 'equals',
    value: steps.length
  });

  // Add time-based conditions
  conditions.push({
    id: uuidv4(),
    type: 'time',
    description: 'Procedure completed within expected timeframe',
    criteria: { maxDuration: steps.length * 180 }, // 3 minutes per step
    operator: 'less_than',
    value: steps.length * 180
  });

  return conditions;
}

/**
 * Generate scenario outcomes from YAML steps
 */
function generateOutcomesFromSteps(steps: YamlStep[]): ScenarioOutcome[] {
  const outcomes: ScenarioOutcome[] = [];

  // Success outcome
  outcomes.push({
    id: uuidv4(),
    type: 'success',
    title: 'Procedure Completed Successfully',
    description: 'All steps were completed correctly and efficiently',
    score: 100,
    feedback: 'Excellent work! You successfully completed the entire procedure following best practices.',
    nextAction: 'review_performance'
  });

  // Partial completion outcome
  outcomes.push({
    id: uuidv4(),
    type: 'warning',
    title: 'Procedure Partially Completed',
    description: 'Most steps were completed but some areas need improvement',
    score: 75,
    feedback: 'Good effort! Review the areas that need improvement and practice those specific steps.',
    nextAction: 'review_mistakes'
  });

  // Time exceeded outcome
  outcomes.push({
    id: uuidv4(),
    type: 'warning',
    title: 'Time Limit Exceeded',
    description: 'Procedure was completed but took longer than expected',
    score: 60,
    feedback: 'The procedure was completed correctly but took too long. Focus on improving efficiency.',
    nextAction: 'time_management_training'
  });

  // Failure outcome
  outcomes.push({
    id: uuidv4(),
    type: 'failure',
    title: 'Procedure Incomplete',
    description: 'The procedure was not completed successfully',
    score: 25,
    feedback: 'The procedure was not completed. Review the requirements and try again.',
    nextAction: 'restart_training'
  });

  return outcomes;
} 