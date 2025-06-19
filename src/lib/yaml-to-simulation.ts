import yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';
import {
  SimulationObject,
  SimulationScenario,
  SimulationTrigger,
  SimulationCondition,
  GeneratedSimulationElements
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
    category: 'Person',
    attributes: {
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
    states: ['stable', 'unstable', 'critical'],
    behaviors: ['assess', 'position', 'monitor', 'examine'],
    signals: ['vital_change', 'position_change', 'status_change'],
    currentState: 'stable',
    simulationTags: ['patient', 'primary'],
    createdAt: now,
    updatedAt: now
  });

  // Healthcare provider object
  objects.push({
    id: uuidv4(),
    name: 'Healthcare Provider',
    category: 'Person',
    attributes: {
      role: 'physician',
      experience: 'experienced',
      sterile: true
    },
    states: ['ready', 'busy', 'sterile', 'contaminated'],
    behaviors: ['perform', 'assess', 'document', 'communicate'],
    signals: ['action_start', 'action_complete', 'status_change'],
    currentState: 'ready',
    simulationTags: ['provider', 'staff'],
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
          category: 'Equipment',
          attributes: {
            isReady: false,
            isCalibrated: true,
            batteryLevel: 100,
            lastMaintenance: new Date().toISOString()
          },
          states: ['ready', 'not_ready', 'in_use', 'maintenance_needed'],
          behaviors: ['setup', 'calibrate', 'use', 'clean'],
          signals: ['status_change', 'maintenance_needed', 'calibration_needed'],
          currentState: 'not_ready',
          simulationTags: ['equipment', keyword],
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
          category: 'Tool',
          attributes: {
            quantity: 1,
            sterile: true,
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          },
          states: ['available', 'in_use', 'depleted', 'expired'],
          behaviors: ['prepare', 'use', 'dispose'],
          signals: ['quantity_change', 'expiration_warning', 'sterility_compromised'],
          currentState: 'available',
          simulationTags: ['material', keyword],
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
          category: 'Location',
          attributes: {
            temperature: 22,
            humidity: 45,
            lighting: 'optimal',
            sterile: stepText.includes('sterile')
          },
          states: ['prepared', 'in_use', 'contaminated', 'needs_cleaning'],
          behaviors: ['prepare', 'maintain', 'monitor'],
          signals: ['environment_change', 'contamination_detected', 'maintenance_needed'],
          currentState: 'prepared',
          simulationTags: ['environment', keyword],
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
    category: 'Tool',
    attributes: {
      completed: false,
      signed: false,
      sections: ['patient_info', 'procedure_notes', 'outcomes']
    },
    states: ['incomplete', 'in_progress', 'completed', 'signed'],
    behaviors: ['complete', 'sign', 'review', 'archive'],
    signals: ['section_complete', 'document_signed', 'review_needed'],
    currentState: 'incomplete',
    simulationTags: ['documentation', 'record'],
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
    instruction: yamlData.purpose,
    requiredObjects: [], // Will be populated with object IDs
    requiredActions: yamlData.goals || [
      'Complete the procedure successfully',
      'Maintain patient safety throughout',
      'Follow proper protocols and guidelines'
    ],
    conditions: [], // Base type requires string[]
    simulationConditions: generateConditionsFromSteps(yamlData.steps), // Detailed conditions
    feedback: 'Complete the procedure following all steps and guidelines',
    position: { x: 0, y: 0 },
    stepIndex: 0,
    isCheckpoint: true,
    simulationTags: ['main', 'complete', 'procedure'],
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
        instruction: `Focused training on decision-making for: ${step.description}`,
        requiredObjects: [],
        requiredActions: [
          `Master the decision criteria for ${step.title}`,
          'Understand the implications of each choice',
          'Practice rapid decision-making'
        ],
        conditions: [],
        simulationConditions: [{
          id: uuidv4(),
          type: 'action',
          description: `Complete ${step.title} decision point`,
          criteria: { stepId: step.id },
          operator: 'exists',
          value: true
        }],
        feedback: 'Make the correct decision based on the situation',
        position: { x: index * 200, y: 100 },
        stepIndex: index + 1,
        isCheckpoint: true,
        expectedResponses: step.options.map(opt => opt.choice),
        simulationTags: ['decision', 'training', step.id],
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
      instruction: 'Training focused on handling emergency situations and complications',
      requiredObjects: [],
      requiredActions: [
        'Recognize emergency situations quickly',
        'Implement emergency protocols correctly',
        'Maintain calm under pressure'
      ],
      conditions: [],
      simulationConditions: [{
        id: uuidv4(),
        type: 'response',
        description: 'Emergency situation triggered',
        criteria: { emergency: true },
        operator: 'equals',
        value: true
      }],
      feedback: 'Handle the emergency situation appropriately',
      position: { x: 0, y: 200 },
      stepIndex: scenarios.length,
      isCheckpoint: true,
      expectedResponses: ['Call for help', 'Assess patient', 'Begin emergency protocol'],
      simulationTags: ['emergency', 'advanced', 'critical'],
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
      objectId: 'system', // System-level trigger
      signal: 'step_start',
      condition: `current_step == ${step.id}`,
      action: `show_message:${step.title}:${step.description}`,
      scenarioId: yamlData.procedure_name,
      isActive: true,
      simulationTags: ['step', 'guidance', step.id],
      createdAt: now
    });

    // Decision point triggers
    if (step.decision_point && step.options) {
      step.options.forEach((option, optionIndex) => {
        triggers.push({
          id: uuidv4(),
          objectId: 'system',
          signal: 'user_choice',
          condition: `current_step == ${step.id} && choice == ${option.choice}`,
          action: `show_message:${option.choice}:${option.condition} && branch_to:${option.next}`,
          scenarioId: yamlData.procedure_name,
          isActive: true,
          simulationTags: ['decision', 'branching', step.id],
          createdAt: now
        });
      });
    }
  });

  // Time-based triggers for procedure monitoring
  triggers.push({
    id: uuidv4(),
    objectId: 'system',
    signal: 'timer_elapsed',
    condition: `time_elapsed > ${yamlData.steps.length * 180}`,
    action: 'show_message:Time Management:The procedure is taking longer than expected. Consider reviewing your pace.',
    scenarioId: yamlData.procedure_name,
    isActive: true,
    cooldown: 300, // 5 minute cooldown
    simulationTags: ['timing', 'warning'],
    createdAt: now
  });

  // Completion trigger
  const finalStep = yamlData.steps.find(step => step.is_terminal);
  if (finalStep) {
    triggers.push({
      id: uuidv4(),
      objectId: 'system',
      signal: 'step_complete',
      condition: `current_step == ${finalStep.id}`,
      action: `show_message:Procedure Complete!:Congratulations! You have successfully completed ${yamlData.procedure_name}. && end_simulation:successful_completion`,
      scenarioId: yamlData.procedure_name,
      isActive: true,
      maxActivations: 1,
      simulationTags: ['completion', 'success'],
      createdAt: now
    });
  }

  // Error handling triggers
  triggers.push({
    id: uuidv4(),
    objectId: 'system',
    signal: 'error_detected',
    condition: 'error_level == critical',
    action: 'show_message:Critical Error:A critical error has occurred. Please review your actions and try again. && play_audio:/sounds/error.mp3',
    scenarioId: yamlData.procedure_name,
    isActive: true,
    simulationTags: ['error', 'critical'],
    createdAt: now
  });

  return triggers;
}

/**
 * Generate scenario conditions from YAML steps
 */
function generateConditionsFromSteps(steps: YamlStep[]): SimulationCondition[] {
  const conditions: SimulationCondition[] = [];

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
function generateOutcomesFromSteps(steps: YamlStep[]): string[] {
  const outcomes: string[] = [
    'Procedure Completed Successfully - All steps were completed correctly and efficiently',
    'Procedure Partially Completed - Most steps were completed but some areas need improvement',
    'Time Limit Exceeded - Procedure was completed but took longer than expected',
    'Procedure Incomplete - The procedure was not completed successfully'
  ];

  return outcomes;
} 