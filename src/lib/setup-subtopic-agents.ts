import { addModuleWithUniversalAgent, updateAgentForSubtopic, getAllModuleConfigurations } from './subtopic-agents';

/**
 * Setup utility for configuring subtopic agents
 * Run this to initialize your modules with the universal agent
 */

// Example: Setup a module with all subtopics using universal agent
export function setupExampleModule() {
  const moduleId = "your-module-id-here";
  const subtopics = [
    "Introduction to Basketball",
    "Basic Rules and Regulations", 
    "Offensive Strategies",
    "Defensive Techniques",
    "Player Positions",
    "Advanced Tactics"
  ];
  
  addModuleWithUniversalAgent(moduleId, subtopics, 70);
  console.log(`✅ Set up module ${moduleId} with universal agent for all subtopics`);
}

// Example: Replace universal agent with specialized agent for one subtopic
export function upgradeSubtopicToSpecializedAgent() {
  updateAgentForSubtopic(
    "your-module-id-here",
    "Offensive Strategies", 
    "agent_specialized_offense_123", // Replace with your new agent ID
    "Coach Mike - Offensive Specialist",
    "Basketball offensive strategies and plays expert",
    75 // Higher passing score for specialized topics
  );
  console.log(`✅ Upgraded "Offensive Strategies" to use specialized agent`);
}

// Utility to show current configuration
export function showCurrentConfiguration() {
  const configs = getAllModuleConfigurations();
  console.log("📋 Current Agent Configurations:");
  console.table(configs);
  
  Object.entries(configs).forEach(([moduleId, subtopics]) => {
    console.log(`\n📚 Module: ${moduleId}`);
    Object.entries(subtopics).forEach(([subtopic, config]) => {
      console.log(`  📖 ${subtopic}: ${config.agentName} (${config.agentId})`);
    });
  });
}

// Quick setup for your actual modules
// Modify this function with your real module IDs and subtopics
export function setupYourModules() {
  console.log("🚀 Setting up your modules with universal agent...");
  
  // TODO: Replace with your actual module data
  // You can get this from your database or module definitions
  
  const yourModules = [
    {
      moduleId: "module-001",
      subtopics: ["Chapter 1", "Chapter 2", "Chapter 3"],
      passingScore: 70
    },
    // Add more modules here
  ];
  
  yourModules.forEach(({ moduleId, subtopics, passingScore }) => {
    addModuleWithUniversalAgent(moduleId, subtopics, passingScore);
    console.log(`✅ Configured ${moduleId} with ${subtopics.length} subtopics`);
  });
  
  console.log("\n🎯 Setup complete! All modules now use the universal agent.");
  console.log("💡 You can now gradually replace with specialized agents using updateAgentForSubtopic()");
}

// Helper to update the universal agent ID if needed
export function updateUniversalAgentId(newAgentId: string) {
  console.log(`🔄 Updating universal agent ID to: ${newAgentId}`);
  // Note: You'll need to manually update the UNIVERSAL_AGENT_ID in subtopic-agents.ts
  console.log("⚠️  Remember to update UNIVERSAL_AGENT_ID in src/lib/subtopic-agents.ts");
}

// Development helper - call this to see what you need to configure
export function getSetupInstructions() {
  console.log(`
🎯 SETUP INSTRUCTIONS FOR PER-SUBTOPIC VOICE CERTIFICATION

✅ AGENT CONFIGURED: Using Coach Alex (Basketball Agent)
   - Agent ID: "agent_01jzk7f85fedsssv51bkehfmg5" 
   - Coach Alex will handle ALL chapter certifications initially
   - This is perfect for testing and immediate use!

2. TEST THE SYSTEM:
   - Complete any module chapter (content + quiz)
   - Click "Start Voice Certification" 
   - Coach Alex will conduct the voice assessment

3. UPGRADE TO SPECIALIZED AGENTS (Optional - Later):
   - Create new agents in ElevenLabs dashboard for specific topics
   - Use updateAgentForSubtopic() to replace Coach Alex for specific chapters
   - Example: updateAgentForSubtopic(moduleId, subtopic, newAgentId, name)

4. VERIFY SETUP:
   - Run showCurrentConfiguration() to see current setup
   - Check console logs for agent assignments

🚀 What users will see:
   - Individual certification buttons for each completed chapter
   - "Chat with Coach Alex" voice assessments per subtopic
   - Progress tracking per chapter
   - Ability to retry individual chapter certifications

🏀 Coach Alex will adapt to any topic - basketball, medical, safety, etc.
   The agent is flexible and will ask relevant questions based on the chapter content!
  `);
}

// Export for easy access
export const SubtopicAgentSetup = {
  setupExampleModule,
  upgradeSubtopicToSpecializedAgent,
  showCurrentConfiguration,
  setupYourModules,
  updateUniversalAgentId,
  getSetupInstructions
}; 