export interface SubtopicAgentConfig {
  agentId: string;
  agentName: string;
  expertise: string;
  passingScore: number;
}

// Phase 1: Universal agent for ALL subtopics - using the existing basketball agent (Coach Alex)
// This means Coach Alex will handle voice certification for all chapters initially
const UNIVERSAL_AGENT_ID = "agent_01jzk7f85fedsssv51bkehfmg5"; // Coach Alex basketball agent

// Phase 2: Gradually replace with specialized agents
// This mapping will grow as you create specialized agents for each subtopic
const SUBTOPIC_AGENT_MAPPING: Record<string, Record<string, SubtopicAgentConfig>> = {
  // Example module mapping - you can add your actual module IDs here
  // Each module can have different agents for different subtopics
  
  // All entries start with Coach Alex and can be replaced one by one
  // "your-module-id-here": {
  //   "Your Subtopic Name": {
  //     agentId: UNIVERSAL_AGENT_ID, // Will replace with specialized agent later
  //     agentName: "Coach Alex",
  //     expertise: "Your Subtopic Name specialist",
  //     passingScore: 70
  //   }
  // }
};

/**
 * Gets the agent ID for a specific subtopic within a module
 * Falls back to universal agent if no specific mapping exists
 */
export function getAgentIdForSubtopic(moduleId: string, subtopic: string): string {
  const moduleAgents = SUBTOPIC_AGENT_MAPPING[moduleId];
  if (!moduleAgents) {
    // If no module configuration exists, use universal agent
    console.log(`No agents configured for module: ${moduleId}, using universal agent`);
    return UNIVERSAL_AGENT_ID;
  }
  
  const agentConfig = moduleAgents[subtopic];
  if (!agentConfig) {
    // If no subtopic configuration exists, use universal agent
    console.log(`No agent configured for subtopic: ${subtopic} in module: ${moduleId}, using universal agent`);
    return UNIVERSAL_AGENT_ID;
  }
  
  return agentConfig.agentId;
}

/**
 * Gets the full agent configuration for a specific subtopic
 * Returns default Coach Alex configuration if no specific mapping exists
 */
export function getSubtopicAgentConfig(moduleId: string, subtopic: string): SubtopicAgentConfig {
  const moduleAgents = SUBTOPIC_AGENT_MAPPING[moduleId];
  if (!moduleAgents || !moduleAgents[subtopic]) {
    // Return default Coach Alex configuration
    return {
      agentId: UNIVERSAL_AGENT_ID,
      agentName: "Coach Alex",
      expertise: `${subtopic} specialist`,
      passingScore: 70
    };
  }
  
  return moduleAgents[subtopic];
}

/**
 * Helper function to easily replace an agent for a specific subtopic
 * Use this to gradually migrate from universal to specialized agents
 */
export function updateAgentForSubtopic(
  moduleId: string, 
  subtopic: string, 
  newAgentId: string, 
  newAgentName: string,
  expertise?: string,
  passingScore?: number
) {
  if (!SUBTOPIC_AGENT_MAPPING[moduleId]) {
    SUBTOPIC_AGENT_MAPPING[moduleId] = {};
  }
  
  SUBTOPIC_AGENT_MAPPING[moduleId][subtopic] = {
    agentId: newAgentId,
    agentName: newAgentName,
    expertise: expertise || `${subtopic} specialist`,
    passingScore: passingScore || 70
  };
  
  console.log(`Updated agent for ${moduleId}/${subtopic}: ${newAgentId}`);
}

/**
 * Get all configured modules and their subtopics
 */
export function getAllModuleConfigurations(): Record<string, Record<string, SubtopicAgentConfig>> {
  return SUBTOPIC_AGENT_MAPPING;
}

/**
 * Check if a module has any specialized agents (vs all universal)
 */
export function hasSpecializedAgents(moduleId: string): boolean {
  const moduleAgents = SUBTOPIC_AGENT_MAPPING[moduleId];
  if (!moduleAgents) return false;
  
  return Object.values(moduleAgents).some(config => config.agentId !== UNIVERSAL_AGENT_ID);
}

/**
 * Add a new module with all subtopics using universal agent
 * This makes it easy to set up a new module quickly
 */
export function addModuleWithUniversalAgent(
  moduleId: string, 
  subtopics: string[], 
  defaultPassingScore: number = 70
) {
  SUBTOPIC_AGENT_MAPPING[moduleId] = {};
  
  subtopics.forEach(subtopic => {
    SUBTOPIC_AGENT_MAPPING[moduleId][subtopic] = {
      agentId: UNIVERSAL_AGENT_ID,
      agentName: "Coach Alex",
      expertise: `${subtopic} specialist`,
      passingScore: defaultPassingScore
    };
  });
  
  console.log(`Added module ${moduleId} with ${subtopics.length} subtopics using universal agent`);
} 