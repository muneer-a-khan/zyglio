import yaml from 'js-yaml';

interface YamlStep {
  id: string;
  title: string;
  description?: string;
  next?: string;
  decision_point?: boolean;
  options?: Array<{
    choice: string;
    next: string;
    condition?: string;
  }>;
  is_terminal?: boolean;
}

interface YamlProcedure {
  name: string;
  version?: string;
  created_date?: string;
  steps: YamlStep[];
}

/**
 * Safely converts YAML content to a valid Mermaid flowchart DSL
 */
export function convertYamlToMermaidDSL(yamlContent: string): { dsl: string; error?: string } {
  try {
    // First, verify the YAML can be parsed
    const parsedYaml = yaml.load(yamlContent) as YamlProcedure;
    
    if (!parsedYaml || !parsedYaml.steps || !Array.isArray(parsedYaml.steps)) {
      return { 
        dsl: generateDefaultFlowchart(),
        error: "Invalid YAML structure: missing 'steps' array"
      };
    }
    
    // Create valid IDs map for consistent node references
    const idMap = createIdMap(parsedYaml.steps);
    
    // Start the flowchart definition
    let dsl = "flowchart TD\n";
    
    // Generate nodes
    parsedYaml.steps.forEach(step => {
      if (!step.id) return;
      
      const nodeId = idMap.get(step.id) || createSafeId(step.id);
      const nodeLabel = sanitizeText(step.title || step.id);
      
      dsl += `  ${nodeId}["${nodeLabel}"]\n`;
    });
    
    // Generate connections
    parsedYaml.steps.forEach(step => {
      if (!step.id) return;
      
      const nodeId = idMap.get(step.id) || createSafeId(step.id);
      
      // Standard connections
      if (step.next && !step.is_terminal) {
        const nextId = idMap.get(step.next) || createSafeId(step.next);
        dsl += `  ${nodeId} --> ${nextId}\n`;
      }
      
      // Decision points
      if (step.decision_point && step.options && Array.isArray(step.options)) {
        step.options.forEach(option => {
          if (option.next && option.next !== step.next) {
            const nextId = idMap.get(option.next) || createSafeId(option.next);
            const label = sanitizeText(option.choice || "Option");
            dsl += `  ${nodeId} -->|${label}| ${nextId}\n`;
          }
        });
      }
    });
    
    // Add styles for terminal nodes
    const terminalNodes = parsedYaml.steps.filter(step => step.is_terminal);
    if (terminalNodes.length > 0) {
      terminalNodes.forEach(step => {
        if (!step.id) return;
        const nodeId = idMap.get(step.id) || createSafeId(step.id);
        dsl += `  style ${nodeId} fill:#e6ffe6,stroke:#99cc99\n`;
      });
    }
    
    // Validate the generated DSL with some basic checks
    if (!validateMermaidDSL(dsl)) {
      return { 
        dsl: generateDefaultFlowchart(),
        error: "Generated invalid Mermaid syntax"
      };
    }
    
    return { dsl };
  } catch (error) {
    console.error("Error converting YAML to Mermaid DSL:", error);
    return { 
      dsl: generateDefaultFlowchart(),
      error: error instanceof Error ? error.message : "Unknown error generating flowchart"
    };
  }
}

/**
 * Creates a map of original IDs to safe IDs for Mermaid
 */
function createIdMap(steps: YamlStep[]): Map<string, string> {
  const idMap = new Map<string, string>();
  
  steps.forEach(step => {
    if (step.id) {
      idMap.set(step.id, createSafeId(step.id));
    }
  });
  
  return idMap;
}

/**
 * Creates a safe ID for Mermaid syntax
 */
function createSafeId(id: string): string {
  // Remove anything that's not alphanumeric, underscore, or hyphen
  let safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
  
  // Ensure it starts with a letter
  if (!safeId || /^[^a-zA-Z]/.test(safeId)) {
    safeId = 'id_' + safeId;
  }
  
  return safeId;
}

/**
 * Sanitize text for Mermaid node labels
 */
function sanitizeText(text: string): string {
  if (!text) return 'Unnamed';
  
  // Make text safe for Mermaid
  return text
    .replace(/\n/g, ' ')         // Replace newlines with spaces
    .replace(/"/g, '\'')         // Replace double quotes with single quotes
    .replace(/</g, '&lt;')       // Convert < to HTML entity
    .replace(/>/g, '&gt;')       // Convert > to HTML entity
    .replace(/[\\{}|;]/g, '')    // Remove backslashes, curly braces, pipes, and semicolons
    .substring(0, 50)            // Limit length
    .trim();
}

/**
 * Basic validation of Mermaid DSL
 */
function validateMermaidDSL(dsl: string): boolean {
  // Check for some basic elements that would indicate valid syntax
  if (!dsl.startsWith('flowchart TD') && !dsl.startsWith('graph TD')) {
    return false;
  }
  
  // Check for basic node definitions
  if (!dsl.includes('["') || !dsl.includes('"]')) {
    return false;
  }
  
  // Check for connections
  if (!dsl.includes('-->')) {
    return false;
  }
  
  return true;
}

/**
 * Generate a default flowchart when there's an error
 */
function generateDefaultFlowchart(): string {
  return `flowchart TD
  start["Start"] --> end["End"]
  style start fill:#f9f9f9,stroke:#999999
  style end fill:#f9f9f9,stroke:#999999`;
} 