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
  // Mitsubishi S12R-Y3MPTAW-7 Engine Noise Diagnosis Training Module
  "56178fd2-8106-4b4f-8567-0217fac890f2": {
    "Engine Specifications and Safety Protocols": {
      agentId: "agent_01jzp5me7jftf8qyew119ey777",
      agentName: "Engine Fundamentals Expert",
      expertise: "Mitsubishi S12R-Y3MPTAW-7 engine specifications and safety protocols specialist",
      passingScore: 75
    },
    "Baseline Engine Performance Parameters": {
      agentId: "agent_01jzp8pqk3ftet16crb6qzxw5v",
      agentName: "Performance Analysis Expert", 
      expertise: "Engine baseline performance parameters and measurement specialist",
      passingScore: 75
    },
    "Noise Identification and Localization Techniques": {
      agentId: "agent_01jzp9jdhzfy8sfwv7x51nhnve",
      agentName: "Noise Diagnosis Expert",
      expertise: "Engine noise identification and localization techniques specialist",
      passingScore: 75
    },
    "Cylinder and Component Isolation Testing": {
      agentId: "agent_01jzp9xx6re6j8ac6wp8ycvf9g",
      agentName: "Advanced Testing Expert",
      expertise: "Cylinder and component isolation testing procedures specialist",
      passingScore: 80
    },
    "Emergency Response and Diagnostic Confirmation": {
      agentId: "agent_01jzpavdksfk09rtbrqgr7n02r",
      agentName: "Emergency Response Expert",
      expertise: "Emergency response procedures and diagnostic confirmation specialist",
      passingScore: 75
    }
  }
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
  // SUPER OBVIOUS DEBUG - if you see this, the file changes are working
  console.log('🚨🚨🚨 NEW DEBUG VERSION OF getSubtopicAgentConfig CALLED 🚨🚨🚨');
  
  // Enhanced debug logging
  console.log('🔍 getSubtopicAgentConfig called with:');
  console.log('   moduleId:', `"${moduleId}"`);
  console.log('   subtopic:', `"${subtopic}"`);
  console.log('   moduleId length:', moduleId.length);
  console.log('   subtopic length:', subtopic.length);
  
  const moduleAgents = SUBTOPIC_AGENT_MAPPING[moduleId];
  console.log('   moduleAgents found:', !!moduleAgents);
  
  if (!moduleAgents) {
    console.log('   ❌ No module configuration found - using Coach Alex');
    console.log('   Available module IDs:');
    Object.keys(SUBTOPIC_AGENT_MAPPING).forEach((id, index) => {
      console.log(`      ${index + 1}. "${id}" (length: ${id.length})`);
    });
    
    // Return default Coach Alex configuration
    return {
      agentId: UNIVERSAL_AGENT_ID,
      agentName: "Coach Alex",
      expertise: `${subtopic} specialist`,
      passingScore: 70
    };
  }
  
  const agentConfig = moduleAgents[subtopic];
  console.log('   agentConfig found:', !!agentConfig);
  
  if (!agentConfig) {
    console.log('   ❌ No subtopic configuration found - using Coach Alex');
    console.log('   Available subtopics for this module:');
    Object.keys(moduleAgents).forEach((sub, index) => {
      console.log(`      ${index + 1}. "${sub}" (length: ${sub.length})`);
    });
    
    // Return default Coach Alex configuration
    return {
      agentId: UNIVERSAL_AGENT_ID,
      agentName: "Coach Alex",
      expertise: `${subtopic} specialist`,
      passingScore: 70
    };
  }
  
  console.log('   ✅ Found specialized agent:', agentConfig.agentName);
  return agentConfig;
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

/**
 * DEBUG FUNCTION: Call this to diagnose agent lookup issues
 * Use in browser console to see what's happening
 */
export function debugAgentLookup(moduleId: string, subtopic: string) {
  console.log('🔍 DEBUG AGENT LOOKUP');
  console.log('====================');
  console.log('📝 Input values:');
  console.log(`   Module ID: "${moduleId}"`);
  console.log(`   Subtopic: "${subtopic}"`);
  console.log(`   Module ID length: ${moduleId.length}`);
  console.log(`   Subtopic length: ${subtopic.length}`);
  
  console.log('\n📚 Available modules:');
  Object.keys(SUBTOPIC_AGENT_MAPPING).forEach((id, index) => {
    const matches = id === moduleId;
    console.log(`   ${index + 1}. "${id}" ${matches ? '✅ MATCH' : '❌'}`);
    if (matches) {
      console.log(`      Available subtopics for this module:`);
      Object.keys(SUBTOPIC_AGENT_MAPPING[id]).forEach((sub, subIndex) => {
        const subMatches = sub === subtopic;
        console.log(`         ${subIndex + 1}. "${sub}" ${subMatches ? '✅ MATCH' : '❌'}`);
      });
    }
  });
  
  console.log('\n🎯 Lookup result:');
  const config = getSubtopicAgentConfig(moduleId, subtopic);
  console.log('   Config returned:', config);
  
  if (config.agentName === 'Coach Alex') {
    console.log('   ❌ USING FALLBACK AGENT (Coach Alex)');
    console.log('   🔧 This means either:');
    console.log('      1. Module ID doesn\'t match exactly');
    console.log('      2. Subtopic name doesn\'t match exactly'); 
    console.log('      3. Check for extra spaces, case differences, or special characters');
  } else {
    console.log('   ✅ USING SPECIALIZED AGENT');
  }
} 